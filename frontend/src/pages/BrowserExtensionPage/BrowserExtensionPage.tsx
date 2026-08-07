import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';

import {
  extensionService,
  type ExtensionDevice,
  type PairingSession,
} from '@/features/extension';
import {
  AccessTimeOutlinedIcon,
  AddIcon,
  Alert,
  Box,
  CheckCircleIcon,
  Chip,
  CircularProgress,
  ContentCopyOutlinedIcon,
  DeleteOutlineIcon,
  HelpOutlineIcon,
  LanguageOutlinedIcon,
  LinkOutlinedIcon,
  LockOutlinedIcon,
  MuiButton,
  Paper,
  Typography,
} from '@/lib/material';

const browserOptions = [
  { name: 'Google Chrome', mark: 'C', color: '#EA4335', href: 'https://chromewebstore.google.com/' },
  { name: 'Microsoft Edge', mark: 'E', color: '#0EA5E9', href: 'https://microsoftedge.microsoft.com/addons/' },
  { name: 'Mozilla Firefox', mark: 'F', color: '#F97316', href: 'https://addons.mozilla.org/firefox/' },
  { name: 'Brave Browser', mark: 'B', color: '#FB542B', href: 'https://chromewebstore.google.com/' },
  { name: 'Opera', mark: 'O', color: '#EF4444', href: 'https://addons.opera.com/' },
] as const;

function browserDetails(userAgent: string | null) {
  const value = userAgent ?? '';
  if (/edg/i.test(value)) return { name: 'Edge', mark: 'E', color: '#0EA5E9' };
  if (/firefox/i.test(value)) return { name: 'Firefox', mark: 'F', color: '#F97316' };
  if (/opr|opera/i.test(value)) return { name: 'Opera', mark: 'O', color: '#EF4444' };
  if (/brave/i.test(value)) return { name: 'Brave', mark: 'B', color: '#FB542B' };
  if (/chrome|chromium/i.test(value)) return { name: 'Chrome', mark: 'C', color: '#EA4335' };
  return { name: 'Browser Extension', mark: 'B', color: '#2563EB' };
}

function platformName(userAgent: string | null) {
  const value = userAgent ?? '';
  if (/windows/i.test(value)) return 'Windows';
  if (/macintosh|mac os/i.test(value)) return 'macOS';
  if (/linux/i.test(value)) return 'Linux';
  return 'Device';
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function BrowserExtensionPage() {
  const [devices, setDevices] = useState<ExtensionDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<PairingSession | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const loadDevices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDevices(await extensionService.getDevices());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load extensions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices();
  }, []);

  useEffect(() => {
    if (!pairing) return;
    const update = () =>
      setTimeLeft(Math.max(0, new Date(pairing.expiresAt).getTime() - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [pairing]);

  const startPairing = async () => {
    setPairingLoading(true);
    setError(null);
    try {
      setPairing(await extensionService.startPairing());
      requestAnimationFrame(() =>
        document.getElementById('connect-browser-extension')?.scrollIntoView({ behavior: 'smooth' }),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create pairing code.');
    } finally {
      setPairingLoading(false);
    }
  };

  const revokeDevice = async (deviceId: number) => {
    try {
      await extensionService.revokeDevice(deviceId);
      setDevices((current) => current.filter((item) => item.id !== deviceId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to revoke access.');
    }
  };

  const connectedCount = devices.length;
  const hasDevices = connectedCount > 0;
  const pairingCode = useMemo(() => pairing?.pairingCode.split('').join('  ') ?? '', [pairing]);

  return (
    <Box
      sx={{
        maxWidth: 1220,
        mx: 'auto',
        p: { xs: 2, sm: 3, lg: 4 },
        pb: { xs: 10, md: 5 },
      }}
    >
      <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 2, justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', mb: 0.5 }} variant="h4">
            Browser Extension
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Connect and manage the Career Copilot extension used for assisted application filling.
          </Typography>
        </Box>
        <MuiButton startIcon={<HelpOutlineIcon />} sx={{ flexShrink: 0 }} variant="outlined">
          How it works
        </MuiButton>
      </Box>

      <Paper sx={{ alignItems: 'center', display: 'flex', gap: 2, mb: 2.5, overflow: 'hidden', p: { xs: 2, sm: 3 } }} variant="outlined">
        <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: 2, color: 'primary.main', display: 'flex', height: 58, justifyContent: 'center', width: 58 }}>
          <LanguageOutlinedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700}>Use the Career Copilot browser extension to autofill applications</Typography>
          <Typography color="text.secondary" variant="body2">
            Install the extension for your browser and connect it to start saving time.
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, opacity: 0.65 }}>
          <LanguageOutlinedIcon color="primary" sx={{ fontSize: 86 }} />
        </Box>
      </Paper>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !hasDevices ? (
        <>
          <Paper sx={{ mb: 2.5, p: { xs: 3, sm: 5 }, textAlign: 'center' }} variant="outlined">
            <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: '50%', color: 'primary.main', display: 'inline-flex', height: 82, justifyContent: 'center', mb: 2, width: 82 }}>
              <LanguageOutlinedIcon sx={{ fontSize: 46 }} />
            </Box>
            <Typography fontWeight={700} sx={{ mb: 0.5 }} variant="h6">No browser extensions connected yet.</Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }} variant="body2">Connect your first extension to get started.</Typography>
            <Button isLoading={pairingLoading} onClick={() => void startPairing()}>
              <AddIcon sx={{ fontSize: 18, mr: 0.75 }} /> Connect New Extension
            </Button>
          </Paper>
          <Paper sx={{ mb: 2.5, p: { xs: 2, sm: 3 } }} variant="outlined">
            <Typography fontWeight={700} variant="h6">Install Career Copilot Extension</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">Choose your browser to get started.</Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
              {browserOptions.map((browser) => (
                <MuiButton
                  component="a"
                  endIcon={<LinkOutlinedIcon />}
                  href={browser.href}
                  key={browser.name}
                  rel="noreferrer"
                  sx={{ borderColor: 'divider', color: 'text.primary', justifyContent: 'space-between', textTransform: 'none' }}
                  target="_blank"
                  variant="outlined"
                >
                  <Box component="span" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                    <Box component="span" sx={{ color: browser.color, fontWeight: 800 }}>{browser.mark}</Box>
                    {browser.name}
                  </Box>
                  <Typography color="primary" component="span" variant="caption">Get Extension</Typography>
                </MuiButton>
              ))}
            </Box>
          </Paper>
          <Paper sx={{ mb: 2.5, p: { xs: 2, sm: 3 } }} variant="outlined">
            <Typography fontWeight={700} sx={{ mb: 2 }}>Why connect the extension?</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
              {[
                ['One-click filling', 'Autofill job applications on supported websites instantly.'],
                ['Secure & private', 'Your data stays protected with encrypted communication.'],
                ['Save time', 'Skip repetitive typing and focus on landing more interviews.'],
              ].map(([title, description]) => (
                <Box key={title} sx={{ borderRight: { sm: '1px solid' }, borderColor: 'divider', pr: 2 }}>
                  <Typography fontWeight={700} variant="body2">{title}</Typography>
                  <Typography color="text.secondary" variant="body2">{description}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </>
      ) : (
        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(300px, 1fr)' }, mb: 2.5 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }} variant="outlined">
            <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography fontWeight={700} variant="h6">Connected Extensions</Typography>
              <Chip color="primary" label={`${connectedCount} Connected`} size="small" />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {devices.map((device) => {
                const browser = browserDetails(device.userAgent);
                return (
                  <Box key={device.id} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, p: 2 }}>
                    <Box sx={{ alignItems: 'center', bgcolor: `${browser.color}15`, borderRadius: 2, color: browser.color, display: 'flex', fontSize: 24, fontWeight: 800, height: 54, justifyContent: 'center', width: 54 }}>{browser.mark}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                        <Typography fontWeight={700}>{browser.name} on {platformName(device.userAgent)}</Typography>
                        <Chip color="success" label="Active" size="small" />
                      </Box>
                      <Typography color="text.secondary" noWrap variant="caption">{device.userAgent ?? 'Browser extension'}</Typography>
                      <Typography color="text.secondary" display="block" variant="caption">
                        Connected on {new Date(device.createdAt).toLocaleDateString()} {device.ipAddress ? ` · IP: ${device.ipAddress}` : ''}
                      </Typography>
                    </Box>
                    <Chip color="success" icon={<CheckCircleIcon />} label="Authorized" size="small" variant="outlined" />
                    <Button
                      onClick={() => void revokeDevice(device.id)}
                      size="small"
                      startIcon={<DeleteOutlineIcon />}
                      tone="danger"
                      variant="outline"
                    >
                      Revoke Access
                    </Button>
                  </Box>
                );
              })}
            </Box>
            <MuiButton fullWidth onClick={() => void startPairing()} startIcon={<AddIcon />} sx={{ borderStyle: 'dashed', mt: 2 }} variant="outlined">
              Connect New Extension
            </MuiButton>
          </Paper>

          <Paper sx={{ p: { xs: 2, sm: 3 } }} variant="outlined">
            <Typography fontWeight={700} variant="h6">Install Career Copilot Extension</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">Choose your browser to get started.</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {browserOptions.map((browser) => (
                <MuiButton
                  component="a"
                  endIcon={<LinkOutlinedIcon />}
                  href={browser.href}
                  key={browser.name}
                  rel="noreferrer"
                  sx={{ borderColor: 'divider', color: 'text.primary', justifyContent: 'space-between', textTransform: 'none' }}
                  target="_blank"
                  variant="outlined"
                >
                  <Box component="span" sx={{ alignItems: 'center', display: 'flex', gap: 1 }}>
                    <Box component="span" sx={{ color: browser.color, fontWeight: 800 }}>{browser.mark}</Box>
                    {browser.name}
                  </Box>
                  <Typography color="primary" component="span" variant="caption">Get Extension</Typography>
                </MuiButton>
              ))}
            </Box>
          </Paper>
        </Box>
      )}

      {pairing ? (
        <Paper id="connect-browser-extension" sx={{ mb: 2.5, p: { xs: 2, sm: 3 } }} variant="outlined">
          <Box sx={{ alignItems: 'flex-start', display: 'flex', gap: 2, mb: 2.5 }}>
            <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: 2, color: 'primary.main', display: 'flex', height: 52, justifyContent: 'center', width: 52 }}>
              <LinkOutlinedIcon />
            </Box>
            <Box>
              <Typography fontWeight={700} variant="h6">Connect Browser Extension</Typography>
              <Typography color="text.secondary" variant="body2">Enter this 6-digit code in the Career Copilot browser extension to securely connect your account.</Typography>
            </Box>
          </Box>
          <Box sx={{ alignItems: 'stretch', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
            <Box sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 1.5, color: 'primary.main', fontFamily: 'monospace', fontSize: { xs: 24, sm: 30 }, fontWeight: 800, letterSpacing: 4, minWidth: 300, p: 2, textAlign: 'center' }}>{pairingCode}</Box>
            <MuiButton
              onClick={() => void navigator.clipboard.writeText(pairing.pairingCode)}
              startIcon={<ContentCopyOutlinedIcon />}
              variant="outlined"
            >
              Copy
            </MuiButton>
            <Box sx={{ alignItems: 'center', bgcolor: 'primary.50', borderRadius: 1.5, display: 'flex', gap: 1.5, ml: { sm: 2 }, p: 2 }}>
              <LockOutlinedIcon color="primary" />
              <Box>
                <Typography fontWeight={700} variant="body2">Your connection is secure</Typography>
                <Typography color="text.secondary" variant="caption">We use encrypted communication to keep your data safe.</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ alignItems: 'center', display: 'flex', gap: 1, mt: 1.5 }}>
            <AccessTimeOutlinedIcon color="action" sx={{ fontSize: 18 }} />
            <Typography color="text.secondary" variant="body2">Code expires in <strong>{formatTime(timeLeft)}</strong></Typography>
          </Box>
          <Button onClick={() => setPairing(null)} sx={{ mt: 2 }}>Done</Button>
        </Paper>
      ) : null}

      <Alert icon={<HelpOutlineIcon />} severity="info">
        <Typography variant="body2"><strong>Tip:</strong> Install the Career Copilot extension from an official browser store to ensure security and receive updates.</Typography>
      </Alert>
    </Box>
  );
}
