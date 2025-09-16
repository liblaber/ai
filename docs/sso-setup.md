# Single Sign-On (SSO) Setup

This guide will help you set up Single Sign-On (SSO) for your liblab.ai instance using OpenID Connect (OIDC). SSO allows your team members to sign in using your organization's existing identity provider (like Okta, Auth0, or Google Workspace) instead of creating separate accounts.

## What is SSO?

Single Sign-On (SSO) lets your team members use their existing work credentials to access liblab.ai. Instead of remembering another username and password, they can sign in with the same login they use for other company tools.

**Benefits:**

- ✅ No need to create new accounts for team members
- ✅ Centralized user management through your existing identity provider
- ✅ Enhanced security with your organization's authentication policies
- ✅ Automatic user provisioning and role assignment

## Prerequisites

Before setting up SSO, you'll need:

1. **An OIDC-compatible identity provider** (such as Okta, Auth0, Google Workspace, or Azure AD)
2. **Administrator access** to your identity provider
3. **Access to your liblab.ai environment variables** (usually in a `.env` file)

## Step 1: Configure Your Identity Provider

### For Okta

1. **Log into your Okta Admin Console**
2. **Create a new application:**
   - Go to Applications → Applications
   - Click "Create App Integration"
   - Choose "OIDC - OpenID Connect"
   - Select "Web Application"
   - Click "Next"

3. **Configure the application:**
   - **App integration name:** `liblab.ai` (or your preferred name)
   - **Grant type:** Check "Authorization Code" and "Refresh Token"
   - **Sign-in redirect URIs:** `https://your-liblab-domain.com/api/auth/sso/callback/your-provider-id`
   - **Sign-out redirect URIs:** `https://your-liblab-domain.com`
   - **Controlled access:** Choose appropriate access settings for your organization

4. **Get your configuration details:**
   - Note down the **Client ID** and **Client Secret** from the General tab
   - The **Issuer URL** is typically: `https://your-domain.okta.com/oauth2/default`

### For Auth0

1. **Log into your Auth0 Dashboard**
2. **Create a new application:**
   - Go to Applications → Applications
   - Click "Create Application"
   - Choose "Regular Web Applications"
   - Click "Create"

3. **Configure the application:**
   - **Name:** `liblab.ai` (or your preferred name)
   - **Allowed Callback URLs:** `https://your-liblab-domain.com/api/auth/sso/callback/your-provider-id`
   - **Allowed Logout URLs:** `https://your-liblab-domain.com`
   - **Token Endpoint Authentication Method:** `POST`

4. **Get your configuration details:**
   - Note down the **Client ID** and **Client Secret** from the Settings tab
   - The **Issuer URL** is typically: `https://your-domain.auth0.com/`

### For Google Workspace

1. **Go to Google Cloud Console**
2. **Create a new project or select existing one**
3. **Enable Google+ API:**
   - Go to APIs & Services → Library
   - Search for "Google+ API" and enable it

4. **Create OAuth 2.0 credentials:**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - **Authorized redirect URIs:** `https://your-liblab-domain.com/api/auth/sso/callback/your-provider-id`

5. **Get your configuration details:**
   - Note down the **Client ID** and **Client Secret**
   - The **Issuer URL** is: `https://accounts.google.com`

## Step 2: Configure liblab.ai

Add the following environment variables to your `.env` file:

```bash
# OIDC SSO Configuration
OIDC_ISSUER=https://your-identity-provider.com/oauth2/default
OIDC_CLIENT_ID=your-client-id-here
OIDC_CLIENT_SECRET=your-client-secret-here
OIDC_DOMAIN=yourcompany.com
OIDC_PROVIDER_ID=your-provider-id
OIDC_FRIENDLY_NAME=Continue with Company SSO
```

### Environment Variable Details

| Variable             | Description                               | Example                                   |
| -------------------- | ----------------------------------------- | ----------------------------------------- |
| `OIDC_ISSUER`        | Your identity provider's issuer URL       | `https://company.okta.com/oauth2/default` |
| `OIDC_CLIENT_ID`     | Client ID from your identity provider     | `0oa1b2c3d4e5f6g7h8i9j0`                  |
| `OIDC_CLIENT_SECRET` | Client secret from your identity provider | `abc123def456ghi789`                      |
| `OIDC_DOMAIN`        | Your organization's email domain          | `yourcompany.com`                         |
| `OIDC_PROVIDER_ID`   | Unique identifier for this SSO provider   | `company-okta`                            |
| `OIDC_FRIENDLY_NAME` | Display name for the SSO button           | `Continue with Company SSO`               |

## Step 3: Restart Your Application

After adding the environment variables, restart your liblab.ai application:

```bash
# If using Docker
docker-compose restart

# If running locally
pnpm run dev
```

## Step 4: Test the SSO Setup

1. **Open your liblab.ai application** in a web browser
2. **Go to the login page**
3. **Look for your SSO button** - it should display the friendly name you configured
4. **Click the SSO button** to test the authentication flow
5. **Sign in with your organization credentials**

## Step 5: User Provisioning

When users sign in through SSO for the first time, liblab.ai will automatically:

- ✅ Create a new user account
- ✅ Assign them to your organization
- ✅ Set appropriate permissions based on their role
- ✅ Accept any pending invitations for their email address

## Troubleshooting

### Common Issues

**"SSO button not appearing"**

- Check that all required environment variables are set correctly
- Verify that your application has been restarted after adding the variables
- Check the application logs for any configuration errors

**"Authentication fails"**

- Verify that the redirect URI in your identity provider matches exactly: `https://your-domain.com/api/auth/sso/callback/your-provider-id`
- Check that the issuer URL is correct and accessible
- Ensure the client ID and secret are correct

**"Users can't sign in"**

- Verify that the domain in `OIDC_DOMAIN` matches your users' email domains
- Check that your identity provider is configured to allow the redirect URI
- Ensure users have access to the application in your identity provider

### Getting Help

If you encounter issues:

1. **Check the application logs** for error messages
2. **Verify your identity provider configuration** matches the examples above
3. **Test with a single user** before rolling out to your entire team
4. **Contact support** if you need additional assistance

## Security Considerations

- **Keep your client secret secure** - never commit it to version control
- **Use HTTPS** for your liblab.ai instance in production
- **Regularly rotate your client secrets** according to your organization's security policies
- **Monitor SSO usage** through your identity provider's audit logs

## Advanced Configuration

For advanced users, you can customize the SSO configuration by modifying the authentication setup in your liblab.ai instance. See the [technical SSO documentation](sso.md) for more details.

## Next Steps

Once SSO is set up:

1. **Invite your team members** - they can now sign in using their work credentials
2. **Set up role-based permissions** - configure what each team member can access
3. **Monitor usage** - track who's using the system and how

Your team can now enjoy seamless access to liblab.ai using their existing work credentials! 🎉
