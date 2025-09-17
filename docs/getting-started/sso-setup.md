# Setting Up Single Sign-On (SSO)

This guide will help you quickly set up SSO for your liblab.ai instance so your team can sign in using your organization's existing identity provider.

## Quick Start

### 1. Get Your Identity Provider Details

You'll need these details from your identity provider (Okta, Auth0, Google Workspace, etc.):

- **Issuer URL** - Your identity provider's endpoint
- **Client ID** - Application identifier
- **Client Secret** - Application secret key
- **Domain** - Your organization's email domain (e.g., `yourcompany.com`)

### 2. Add Environment Variables

Add these to your `.env` file:

- `OIDC_ISSUER` - Your identity provider's issuer URL
- `OIDC_CLIENT_ID` - Client ID from your identity provider
- `OIDC_CLIENT_SECRET` - Client secret from your identity provider
- `OIDC_DOMAIN` - Your organization's email domain
- `OIDC_PROVIDER_ID` - Unique identifier for this SSO provider
- `OIDC_FRIENDLY_NAME` - Display name for the SSO button

### 3. Restart Your Application

- **If using Docker:** Run `docker-compose restart`
- **If running locally:** Run `pnpm run dev`

### 4. Test SSO

1. Open your liblab.ai application
2. Look for the SSO button on the login page
3. Click it and sign in with your work credentials

## Need More Help?

For detailed setup instructions with your specific identity provider, see our [complete SSO Setup Guide](../sso-setup.md).

## What Happens Next?

Once SSO is configured:

- Your team can sign in with their work credentials
- New users are automatically added to your organization
- You can manage access through your identity provider
- All authentication policies from your identity provider apply
