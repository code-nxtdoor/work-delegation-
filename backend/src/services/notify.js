import { config } from '../config.js';

/**
 * Post a message to Slack through an incoming webhook (SLACK_WEBHOOK_URL).
 * Returns { sent: false } when Slack isn't configured so callers can show the draft instead.
 */
export async function postToSlack(text) {
  if (!config.slackWebhookUrl) return { sent: false, reason: 'SLACK_WEBHOOK_URL is not set' };
  const res = await fetch(config.slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`Slack returned ${res.status}: ${await res.text()}`);
  return { sent: true };
}

export function slackChannelName(project) {
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `#${slug(project.client.split(' ')[0] || 'proj')}-${slug(project.name)}`.slice(0, 80);
}

export function placementMessage(project) {
  const res = project.team.filter(t => t.as === 'resource').map(t => t.name);
  const shd = project.team.filter(t => t.as === 'shadow').map(t => t.name);
  return [
    `*${project.name}* (${project.client}) is staffed.`,
    `Resources: ${res.join(', ') || 'none yet'}`,
    shd.length ? `Shadows: ${shd.join(', ')}` : null,
    `Kickoff is limited to the ${res.length} placed engineer${res.length === 1 ? '' : 's'}. Join ${slackChannelName(project)} to get started.`
  ].filter(Boolean).join('\n');
}
