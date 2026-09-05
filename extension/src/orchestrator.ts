const API_URL = 'http://localhost:3000/api/v1';
const POLL_INTERVAL_MS = 15000; // 15 seconds

export function startPolling() {
  setInterval(async () => {
    try {
      const { accessToken } = await chrome.storage.local.get(['accessToken']);
      if (!accessToken) return; // Not authenticated

      // Fetch job applications
      const response = await fetch(`${API_URL}/auto-apply/job-applications`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return;
      const json = await response.json();
      const applications = json.data;

      // Find one in QUEUED status
      const queuedJob = applications.find((app: any) => app.status === 'QUEUED');
      if (queuedJob) {
        await processQueuedJob(queuedJob, accessToken);
      }
    } catch (error) {
      console.error('Error polling for jobs:', error);
    }
  }, POLL_INTERVAL_MS);
}

async function processQueuedJob(job: any, accessToken: string) {
  try {
    // 1. Transition status to SUBMITTING
    await fetch(`${API_URL}/auto-apply/job-applications/${job.id}/status-transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ toStatus: 'SUBMITTING' }),
    });

    // 2. We need the job URL. We might have to fetch the plan or analysis to get it.
    // For now, let's fetch the plan to get the jobPageUrl
    const planResponse = await fetch(`${API_URL}/auto-apply/planner/${job.jobId}/plan`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!planResponse.ok) throw new Error('Could not fetch plan');
    const planJson = await planResponse.json();
    const jobUrl = planJson.data.pageAnalysis?.jobPageUrl;

    if (!jobUrl) {
      throw new Error('No job URL available to apply to.');
    }

    // 3. Open tab
    const tab = await chrome.tabs.create({ url: jobUrl, active: false });

    // 4. Wait for tab to load, then trigger autofill (we might need a more robust wait mechanism, but simple timeout for now)
    setTimeout(async () => {
      if (tab.id) {
        try {
          // Extract fields
          const extractResponse = await chrome.tabs.sendMessage(tab.id, {
            action: 'EXTRACT_FORM_FIELDS',
          });
          if (extractResponse && extractResponse.fields) {
            // Get answers from autofill API
            const autofillRes = await fetch(`${API_URL}/extension/autofill`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                url: jobUrl,
                fields: extractResponse.fields,
              }),
            });

            if (autofillRes.ok) {
              const autofillJson = await autofillRes.json();
              await chrome.tabs.sendMessage(tab.id, {
                action: 'PREVIEW_AUTOFILL',
                fields: extractResponse.fields,
                answers: autofillJson.data.answers,
              });

              // Transition to ACTION_REQUIRED so user can review and submit
              await fetch(`${API_URL}/auto-apply/job-applications/${job.id}/status-transitions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ toStatus: 'ACTION_REQUIRED' }),
              });
            }
          }
        } catch (e) {
          console.error('Error during tab injection/autofill', e);
        }
      }
    }, 5000); // Wait 5 seconds for page to load
  } catch (error) {
    console.error('Error processing queued job:', error);
    // Transition to FAILED if possible
    try {
      await fetch(`${API_URL}/auto-apply/job-applications/${job.id}/status-transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ toStatus: 'SUBMISSION_FAILED' }),
      });
    } catch (e) {
      // Ignore
    }
  }
}
