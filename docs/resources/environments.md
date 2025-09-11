# Environments

Environments are a resource used for managing different data sources, secrets, and published applications. They help you organize and switch between different configurations for development, testing, and production scenarios.

## Default Environments

By default, two environments are created for you:
- **Development** - For building and testing applications
- **Production** - For live applications with production data

## Managing Environments

You can add, edit, or delete environments from **Settings → Environments**. This allows you to create custom environments that fit your workflow (e.g., Staging, Testing, QA).

## Environments with Data Sources

Environments are particularly useful when working with data sources. You can define a single data source that connects to different databases or services across environments.

**Example:**
- Create a PostgreSQL data source in the **Settings → Data Sources**
- Add a development database connection URL for the **Development** environment
- Add a production database connection URL for the **Production** environment

This setup allows you to build and test applications using different data sets without changing your application code.

## Environments with Secrets

Similar to data sources, you can manage secrets (API keys, tokens, credentials) for different environments. This allows you to use different secret values across your development, staging, and production environments.

You can add, update, or delete secrets for any specific environment from **Settings → Secrets Manager**. All secrets are encrypted and securely stored, ensuring that your applications use the appropriate credentials for each environment without exposing sensitive data.

## Switching Environments

If you have a data source configured for multiple environments, you can switch between them while working on your application:

1. Look for the conversation settings dropdown at the top center of the screen (next to your conversation name)
2. Click the dropdown to open the conversation settings
3. Use the **Data Source Environment** dropdown to select a different environment
4. Your application will immediately switch to use the data from the selected environment

## Published Applications

The environment switching feature is particularly powerful when combined with the publish functionality. By using the Switch Environments feature, you can set the current data source from a specific environment to your current conversation. Once you have the desired environment selected, you can then use the publish feature to publish an application that uses the currently selected data source.

This workflow allows you to:
- Build and test your application using development data
- Switch to production environment when ready
- Publish the application with production data sources and secrets

## Important Considerations

⚠️ **Schema Compatibility**: When defining a data source across multiple environments, ensure that all environments share the same database schema. If you build an application using one environment and then switch to another, mismatched schemas can break your application.

**Best Practice**: Keep your database schemas synchronized across all environments to ensure seamless switching between them.