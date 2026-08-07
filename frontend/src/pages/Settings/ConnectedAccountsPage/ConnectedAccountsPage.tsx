import GoogleIcon from '@mui/icons-material/Google';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectedAccountsService } from '@/services/connected-accounts.service';

export function ConnectedAccountsPage() {
  const queryClient = useQueryClient();

  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: connectedAccountsService.getAccounts,
  });

  const { mutate: connectGoogle, isPending: isConnecting } = useMutation({
    mutationFn: () =>
      connectedAccountsService.getGoogleAuthUrl('/settings/connected-accounts/google/result'),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  const { mutate: disconnect, isPending: isDisconnecting } = useMutation({
    mutationFn: (accountId: number) => connectedAccountsService.disconnectAccount(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
    },
  });

  const googleAccount = accounts?.find((a) => a.provider === 'GOOGLE');

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography gutterBottom variant="h4">
        Connected Accounts
      </Typography>
      <Typography color="text.secondary" paragraph variant="body1">
        Manage integrations with third-party services like Google.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load connected accounts.
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Box alignItems="center" display="flex" justifyContent="space-between" mb={2}>
          <Box alignItems="center" display="flex" gap={2}>
            <GoogleIcon color="action" fontSize="large" />
            <Box>
              <Typography variant="h6">Google Account</Typography>
              <Typography color="text.secondary" variant="body2">
                Connect your Google account for future Gmail integrations.
              </Typography>
            </Box>
          </Box>

          {!googleAccount ? (
            <Button
              disabled={isConnecting || isLoading}
              onClick={() => {
                connectGoogle();
              }}
              startIcon={isConnecting ? <CircularProgress size={20} /> : undefined}
              variant="contained"
            >
              Connect Google
            </Button>
          ) : null}
        </Box>

        {isLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        ) : googleAccount ? (
          <List>
            <ListItem
              secondaryAction={
                <Button
                  color="error"
                  disabled={isDisconnecting}
                  onClick={() => {
                    disconnect(googleAccount.id);
                  }}
                  size="small"
                >
                  Disconnect
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar src={googleAccount.avatarUrl ?? undefined}>
                  {googleAccount.displayName?.[0] ?? 'G'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={googleAccount.displayName ?? googleAccount.emailAddress}
                secondary={googleAccount.emailAddress}
              />
              <Chip
                color={googleAccount.status === 'ACTIVE' ? 'success' : 'warning'}
                label={googleAccount.status}
                size="small"
                sx={{ mr: 8 }}
              />
            </ListItem>
          </List>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No Google account connected yet.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
