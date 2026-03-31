const { sendMessage } = require('./whatsappService');
const { BlastCampaign, BlastLog } = require('../models/BlastCampaign');
const fs = require('fs');
const path = require('path');

const runningCampaigns = new Map(); // campaignId -> { running, paused }

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function startCampaign(campaignId, io) {
  const campaign = await BlastCampaign.findByPk(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status === 'running') throw new Error('Campaign already running');

  await campaign.update({ status: 'running', started_at: new Date() });
  runningCampaigns.set(campaignId, { running: true, paused: false });

  io.emit(`campaign_${campaignId}`, { status: 'running' });

  // Get pending blast logs
  const pendingLogs = await BlastLog.findAll({
    where: { campaign_id: campaignId, status: 'pending' },
    order: [['id', 'ASC']],
  });

  let sentCount = campaign.sent_count;
  let failedCount = campaign.failed_count;

  for (const log of pendingLogs) {
    const state = runningCampaigns.get(campaignId);
    if (!state || !state.running) break;

    // Wait while paused
    while (state && state.paused) {
      await sleep(1000);
    }

    if (!state || !state.running) break;

    try {
      let mediaOptions = null;
      if (campaign.media_type !== 'none' && campaign.media_url) {
        const filePath = path.resolve(campaign.media_url);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const mimetype = getMimeType(campaign.media_url);
          mediaOptions = {
            type: campaign.media_type,
            buffer,
            mimetype,
            filename: path.basename(campaign.media_url),
          };
        }
      }

      const result = await sendMessage(campaign.session_id, log.phone_number, campaign.message, mediaOptions);
      await log.update({ status: 'sent', message_id: result?.key?.id || null, sent_at: new Date() });
      sentCount++;

      io.emit(`campaign_${campaignId}`, {
        status: 'running',
        sentCount,
        failedCount,
        currentPhone: log.phone_number,
        progress: Math.round(((sentCount + failedCount) / campaign.total_contacts) * 100),
      });

    } catch (err) {
      await log.update({ status: 'failed', error_message: err.message });
      failedCount++;
      console.error(`Failed to send to ${log.phone_number}:`, err.message);
    }

    await campaign.update({ sent_count: sentCount, failed_count: failedCount });

    // Random delay between messages
    const delay = randomDelay(campaign.delay_min, campaign.delay_max);
    await sleep(delay);
  }

  const finalState = runningCampaigns.get(campaignId);
  if (finalState && finalState.running) {
    await campaign.update({ status: 'completed', completed_at: new Date() });
    io.emit(`campaign_${campaignId}`, { status: 'completed', sentCount, failedCount });
  }

  runningCampaigns.delete(campaignId);
}

async function pauseCampaign(campaignId, io) {
  const state = runningCampaigns.get(campaignId);
  if (state) {
    state.paused = true;
    await BlastCampaign.update({ status: 'paused' }, { where: { id: campaignId } });
    io.emit(`campaign_${campaignId}`, { status: 'paused' });
  }
}

async function resumeCampaign(campaignId, io) {
  const state = runningCampaigns.get(campaignId);
  if (state && state.paused) {
    state.paused = false;
    await BlastCampaign.update({ status: 'running' }, { where: { id: campaignId } });
    io.emit(`campaign_${campaignId}`, { status: 'running' });
  } else {
    // Re-start if not in memory (server restart)
    await startCampaign(campaignId, io);
  }
}

async function stopCampaign(campaignId, io) {
  const state = runningCampaigns.get(campaignId);
  if (state) {
    state.running = false;
    state.paused = false;
  }
  await BlastCampaign.update({ status: 'failed', completed_at: new Date() }, { where: { id: campaignId } });
  runningCampaigns.delete(campaignId);
  io.emit(`campaign_${campaignId}`, { status: 'stopped' });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
    '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = { startCampaign, pauseCampaign, resumeCampaign, stopCampaign };
