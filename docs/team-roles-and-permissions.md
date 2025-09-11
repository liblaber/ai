# **Managing Your Team with Roles and Permissions 🔐**

Our app includes Role-Based Access Control (RBAC) to help you securely manage what each team member can see and do within your organization. This ensures that members only have access to the specific resources—like Data Sources, Environments, and Apps—that they need for their job.

You can manage access in two ways: through broad **Organization Roles** assigned when you invite a member, and through specific **Resource Permissions** for more detailed control.

## **Organization Roles**

When you invite a new member to your organization, you'll assign them one of three primary roles. These roles define their default level of access across the entire workspace.

- ### **Admin** **An Admin has full control over the entire organization. This role is perfect for team leads or system administrators.**
  - ✅ Can create, view, edit, and delete all **Data Sources**, **Environments**, and **Apps**.
  - ✅ Can invite new members and manage the roles of existing members.

- ### **Builder** **A Builder has full access to create and manage resources but cannot manage the team. This role is ideal for developers and creators who build and maintain your internal apps.**
  - ✅ Can create, view, edit, and delete all **Data Sources**, **Environments**, and **Apps**.
  - ❌ **Cannot** invite new members or change the roles of existing members.

- ### **App User** **An App User can view and interact with all deployed applications in the organization. This is a view-only role designed for end-users of the internal tools you build.**
  - ✅ Can view and use **all deployed Apps**.
  - ❌ **Cannot** access Data Sources or Environments.
  - ❌ **Cannot** invite or manage other members.

## **Granular Resource Permissions**

Sometimes, a member's organization-level role isn't specific enough. For these situations, you can assign permissions for individual resources to grant access that falls outside of a member's general role. For example, you might want to give an App User editing rights to a single app, or a Builder view-only access to a sensitive data source.

When sharing a specific **Environment**, **Data Source**, or **App**, you can grant a member one of two permission levels:

- **Full Access**: The member can fully manage the resource. This includes the ability to view, edit, and delete it.
- **Viewer**: The member can only view and use the resource. They cannot make any changes or delete it.

### **How to Share a Resource**

1. Navigate to the **Settings** panel using the cog icon (⚙️) in the left sidebar.
2. Select the resource type you want to share (e.g., **Data Sources**).
3. Click on the specific resource to open its settings.
4. Find the **Members Access** section and add the member, assigning them either **Full Access** or **Viewer** permissions.

## **A Note on Environment Permissions**

Granting access to an **Environment** has a special cascading effect. When you give a member access to an environment, they automatically gain the **same level of permission** for all Data Sources and Apps contained within that environment.

For example, if you give a member **Viewer** access to your "Production" Environment, they will be able to view all the apps and data sources that belong to that environment.
