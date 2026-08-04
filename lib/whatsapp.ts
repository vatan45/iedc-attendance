/**
 * WhatsApp Group Automation Gateway
 * Sends rich markdown alerts to a selected WhatsApp team group when tickets are created.
 * Supports: Green-API, UltraMsg, Evolution API, and Universal Webhooks (n8n / Make / Zapier).
 */

interface TaskNotificationPayload {
  title: string;
  description: string;
  assigneeName: string;
  assignerName: string;
  priority: string;
  dueDate: string | null;
  taskId: string;
}

export async function sendWhatsAppTaskNotification(task: TaskNotificationPayload) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iedcattendance.vercel.app';
    const taskLink = `${appUrl.replace(/\/$/, '')}/tasks/${task.taskId}`;

    // Priority Emoji Mapping
    const priorityEmoji: Record<string, string> = {
      urgent: '🚨 *URGENT*',
      high: '🔴 *HIGH*',
      medium: '🟡 *MEDIUM*',
      low: '🟢 *LOW*',
    };

    const formattedDueDate = task.dueDate 
      ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No Deadline Specified';

    // WhatsApp Formatted Text (using *bold* and _italics_)
    const message = `📋 *NEW TASK ASSIGNMENT*\n` +
      `------------------------------------\n` +
      `📌 *Task:* ${task.title}\n` +
      `👤 *Assigned To:* ${task.assigneeName}\n` +
      `🏢 *Assigned By:* ${task.assignerName}\n` +
      `⚡ *Priority:* ${priorityEmoji[task.priority.toLowerCase()] || task.priority.toUpperCase()}\n` +
      `📅 *Due Date:* ${formattedDueDate}\n\n` +
      `📝 *Description:*\n_${task.description}_\n\n` +
      `🔗 *View Ticket:* ${taskLink}`;

    console.log('[WhatsApp Gateway] Dispatching Group Notification:', { title: task.title, assignee: task.assigneeName });

    const promises: Promise<any>[] = [];

    // 1. Green API Integration (https://greenapi.com/)
    const greenApiId = process.env.GREEN_API_ID_INSTANCE;
    const greenApiToken = process.env.GREEN_API_TOKEN_INSTANCE;
    const greenApiGroup = process.env.GREEN_API_GROUP_CHAT_ID; // e.g. "12036302837462@g.us"
    if (greenApiId && greenApiToken && greenApiGroup) {
      const url = `https://api.green-api.com/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: greenApiGroup,
            message: message,
            linkPreview: true,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Green API Error]:', await res.text());
          else console.log('[Green API] Successfully sent message.');
        }).catch(err => console.error('[Green API Failure]:', err))
      );
    }

    // 2. UltraMsg Integration (https://ultramsg.com/)
    const ultraMsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultraMsgToken = process.env.ULTRAMSG_TOKEN;
    const ultraMsgGroup = process.env.ULTRAMSG_GROUP_ID; // e.g. "12036302837462@g.us"
    if (ultraMsgInstance && ultraMsgToken && ultraMsgGroup) {
      const url = `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ultraMsgToken,
            to: ultraMsgGroup,
            body: message,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[UltraMsg Error]:', await res.text());
          else console.log('[UltraMsg] Successfully sent message.');
        }).catch(err => console.error('[UltraMsg Failure]:', err))
      );
    }

    // 3. Evolution API / Self-Hosted Instance (Baileys / WhatsApp Web JS)
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;
    const evolutionGroup = process.env.EVOLUTION_GROUP_ID;
    if (evolutionUrl && evolutionKey && evolutionInstance && evolutionGroup) {
      const endpoint = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${evolutionInstance}`;
      promises.push(
        fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionKey
          },
          body: JSON.stringify({
            number: evolutionGroup,
            options: { delay: 1200, presence: "composing", linkPreview: true },
            textMessage: { text: message }
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Evolution API Error]:', await res.text());
          else console.log('[Evolution API] Successfully sent message.');
        }).catch(err => console.error('[Evolution API Failure]:', err))
      );
    }

    // 4. Universal Webhook (Zapier / n8n / Make / Custom Bot)
    const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
    if (webhookUrl) {
      promises.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'task_created',
            message: message,
            task: task,
            targetGroup: process.env.WHATSAPP_TARGET_GROUP || 'default_team_group'
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Webhook Error]:', await res.text());
          else console.log('[Webhook] Successfully forwarded task notification.');
        }).catch(err => console.error('[Webhook Failure]:', err))
      );
    }

    if (promises.length === 0) {
      console.log('[WhatsApp Gateway] No API credentials configured in environment variables. Skipped dispatch.');
    } else {
      await Promise.all(promises);
    }
  } catch (error) {
    // We log and ignore errors so task creation never fails if WhatsApp API is unreachable
    console.error('[WhatsApp Automation Exception]:', error);
  }
}

interface TaskUpdateNotificationPayload {
  title: string;
  assigneeName: string;
  adminName: string;
  priority: string;
  dueDate: string | null;
  taskId: string;
  updateMessage?: string;
}

export async function sendWhatsAppTaskUpdateNotification(task: TaskUpdateNotificationPayload) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://iedcattendance.vercel.app';
    const taskLink = `${appUrl.replace(/\/$/, '')}/tasks/${task.taskId}`;

    // Priority Emoji Mapping
    const priorityEmoji: Record<string, string> = {
      urgent: '🚨 *URGENT*',
      high: '🔴 *HIGH*',
      medium: '🟡 *MEDIUM*',
      low: '🟢 *LOW*',
    };

    const formattedDueDate = task.dueDate 
      ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No Deadline Specified';

    const customNote = task.updateMessage && task.updateMessage.trim() !== ''
      ? task.updateMessage.trim()
      : 'Please share your progress update and status on this task today.';

    // WhatsApp Formatted Text
    const message = `🔔 *TASK UPDATE REQUESTED*\n` +
      `------------------------------------\n` +
      `📌 *Task:* ${task.title}\n` +
      `👤 *Assigned To:* ${task.assigneeName}\n` +
      `🏢 *Requested By:* ${task.adminName}\n` +
      `⚡ *Priority:* ${priorityEmoji[task.priority.toLowerCase()] || task.priority.toUpperCase()}\n` +
      `📅 *Due Date:* ${formattedDueDate}\n\n` +
      `❓ *Update Instructions:*\n_${customNote}_\n\n` +
      `🔗 *Respond & View Ticket:* ${taskLink}`;

    console.log('[WhatsApp Gateway] Dispatching Update Request Notification:', { title: task.title, assignee: task.assigneeName });

    const promises: Promise<any>[] = [];

    // 1. Green API Integration (https://greenapi.com/)
    const greenApiId = process.env.GREEN_API_ID_INSTANCE;
    const greenApiToken = process.env.GREEN_API_TOKEN_INSTANCE;
    const greenApiGroup = process.env.GREEN_API_GROUP_CHAT_ID;
    if (greenApiId && greenApiToken && greenApiGroup) {
      const url = `https://api.green-api.com/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: greenApiGroup,
            message: message,
            linkPreview: true,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Green API Error]:', await res.text());
          else console.log('[Green API] Successfully sent update request message.');
        }).catch(err => console.error('[Green API Failure]:', err))
      );
    }

    // 2. UltraMsg Integration (https://ultramsg.com/)
    const ultraMsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultraMsgToken = process.env.ULTRAMSG_TOKEN;
    const ultraMsgGroup = process.env.ULTRAMSG_GROUP_ID;
    if (ultraMsgInstance && ultraMsgToken && ultraMsgGroup) {
      const url = `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ultraMsgToken,
            to: ultraMsgGroup,
            body: message,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[UltraMsg Error]:', await res.text());
          else console.log('[UltraMsg] Successfully sent update request message.');
        }).catch(err => console.error('[UltraMsg Failure]:', err))
      );
    }

    // 3. Evolution API / Self-Hosted Instance
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;
    const evolutionGroup = process.env.EVOLUTION_GROUP_ID;
    if (evolutionUrl && evolutionKey && evolutionInstance && evolutionGroup) {
      const endpoint = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${evolutionInstance}`;
      promises.push(
        fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': evolutionKey
          },
          body: JSON.stringify({
            number: evolutionGroup,
            options: { delay: 1200, presence: "composing", linkPreview: true },
            textMessage: { text: message }
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Evolution API Error]:', await res.text());
          else console.log('[Evolution API] Successfully sent update request message.');
        }).catch(err => console.error('[Evolution API Failure]:', err))
      );
    }

    // 4. Universal Webhook
    const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
    if (webhookUrl) {
      promises.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'task_update_requested',
            message: message,
            task: task,
            targetGroup: process.env.WHATSAPP_TARGET_GROUP || 'default_team_group'
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Webhook Error]:', await res.text());
          else console.log('[Webhook] Successfully forwarded task update request.');
        }).catch(err => console.error('[Webhook Failure]:', err))
      );
    }

    if (promises.length === 0) {
      console.log('[WhatsApp Gateway] No API credentials configured in environment variables. Skipped update request dispatch.');
    } else {
      await Promise.all(promises);
    }
  } catch (error) {
    console.error('[WhatsApp Automation Exception]:', error);
  }
}

interface AttendanceNotificationPayload {
  employeeCode: string;
  employeeName: string;
  type: 'entry' | 'exit';
  scannedAt: string;
}

export async function sendWhatsAppAttendanceNotification(attendance: AttendanceNotificationPayload) {
  // Instant notifications upon scan disabled per admin request to avoid chat flooding.
  // All attendance logs for the last 24 hours are consolidated into the daily 9 PM summary report.
  return;
}

export interface EmployeeDailySummary {
  employeeCode: string;
  employeeName: string;
  logs: {
    type: 'entry' | 'exit' | string;
    scannedAt: string;
  }[];
  totalHours: number;
  isStillInside: boolean;
}

export async function sendWhatsAppDailyAttendanceSummary(summaryList: EmployeeDailySummary[], reportDate: string) {
  try {
    const formattedDate = new Date(reportDate).toLocaleDateString('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    });

    if (summaryList.length === 0) {
      console.log('[WhatsApp Gateway] No attendance records for today. Skipping empty daily summary report.');
      return;
    }

    let reportLines = `📅 *DAILY ATTENDANCE SUMMARY*\n` +
      `🗓️ *Date:* ${formattedDate}\n` +
      `⏰ *Report Time:* 9:00 PM\n` +
      `------------------------------------\n\n`;

    for (const emp of summaryList) {
      reportLines += `👤 *${emp.employeeName} (${emp.employeeCode})*\n`;
      for (const log of emp.logs) {
        const timeStr = new Date(log.scannedAt).toLocaleTimeString('en-IN', {
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        });
        const icon = log.type === 'entry' ? '🟢' : '🔴';
        const label = log.type === 'entry' ? 'Entry' : 'Exit';
        reportLines += `  ${icon} ${label}: ${timeStr}\n`;
      }

      if (emp.isStillInside) {
        reportLines += `  ⚠️ _Status: Still Inside (No exit scanned)_\n`;
      }
      
      const hours = Math.floor(emp.totalHours);
      const minutes = Math.round((emp.totalHours - hours) * 60);
      const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      reportLines += `  ⏱️ *Total Duration:* ~${durationFormatted}\n\n`;
    }

    reportLines += `------------------------------------\n` +
      `📊 *Total Present Today:* ${summaryList.length} employee${summaryList.length > 1 ? 's' : ''}`;

    console.log('[WhatsApp Gateway] Dispatching Daily 9 PM Attendance Summary Report:', { count: summaryList.length });

    const promises: Promise<any>[] = [];

    // 1. Green API Integration
    const greenApiId = process.env.GREEN_API_ID_INSTANCE;
    const greenApiToken = process.env.GREEN_API_TOKEN_INSTANCE;
    const greenApiGroup = process.env.GREEN_API_GROUP_CHAT_ID;
    if (greenApiId && greenApiToken && greenApiGroup) {
      const url = `https://api.green-api.com/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: greenApiGroup,
            message: reportLines,
            linkPreview: false,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Green API Error]:', await res.text());
          else console.log('[Green API] Successfully sent daily summary message.');
        }).catch(err => console.error('[Green API Failure]:', err))
      );
    }

    // 2. UltraMsg Integration
    const ultraMsgInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultraMsgToken = process.env.ULTRAMSG_TOKEN;
    const ultraMsgGroup = process.env.ULTRAMSG_GROUP_ID;
    if (ultraMsgInstance && ultraMsgToken && ultraMsgGroup) {
      const url = `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`;
      promises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ultraMsgToken,
            to: ultraMsgGroup,
            body: reportLines,
          }),
        }).then(async res => {
          if (!res.ok) console.error('[UltraMsg Error]:', await res.text());
          else console.log('[UltraMsg] Successfully sent daily summary message.');
        }).catch(err => console.error('[UltraMsg Failure]:', err))
      );
    }

    // 3. Evolution API / Self-Hosted Instance
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE_NAME;
    const evolutionGroup = process.env.EVOLUTION_GROUP_ID;
    if (evolutionUrl && evolutionKey && evolutionInstance && evolutionGroup) {
      const endpoint = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${evolutionInstance}`;
      promises.push(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionKey,
          },
          body: JSON.stringify({
            number: evolutionGroup,
            options: { delay: 1200, presence: 'composing', linkPreview: false },
            textMessage: { text: reportLines },
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Evolution API Error]:', await res.text());
          else console.log('[Evolution API] Successfully sent daily summary message.');
        }).catch(err => console.error('[Evolution API Failure]:', err))
      );
    }

    // 4. Universal Webhook
    const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
    if (webhookUrl) {
      promises.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'daily_attendance_summary',
            message: reportLines,
            summary: summaryList,
            reportDate,
            targetGroup: process.env.WHATSAPP_TARGET_GROUP || 'default_team_group',
          }),
        }).then(async res => {
          if (!res.ok) console.error('[Webhook Error]:', await res.text());
          else console.log('[Webhook] Successfully forwarded daily summary report.');
        }).catch(err => console.error('[Webhook Failure]:', err))
      );
    }

    if (promises.length === 0) {
      console.log('[WhatsApp Gateway] No API credentials configured in environment variables. Skipped daily summary dispatch.');
    } else {
      await Promise.all(promises);
    }
  } catch (error) {
    console.error('[WhatsApp Automation Exception]:', error);
  }
}

