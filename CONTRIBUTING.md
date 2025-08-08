# Contributing to liblab.ai

Thank you for your interest in contributing to **liblab.ai**! We're building the future of AI-powered developer tools, and your contributions help make that vision a reality. 🚀

---

## 🛡️ Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 🚀 Getting Started

### Before You Start

1. **Read our [Governance Model](GOVERNANCE.md)** to understand how decisions are made
2. **Browse existing [Issues](https://github.com/liblaber/ai/issues)** to see what's being worked on
3. **Look for "good first issue" labels** for beginner-friendly tasks

### Development Environment Setup

> **⚡ Quick Setup**: Use our automated script from the main README, then return here for contribution workflow.

**For contributors making code changes:**

1. **Fork and clone your fork:**

   ```bash
   git clone https://github.com/your-username/liblab.ai.git
   cd liblab.ai
   ```

2. **Follow the [README setup instructions](README.md#quick-start)** to get the project running

3. **Verify everything works:**
   ```bash
   pnpm test
   pnpm lint
   ```

### Database Setup

liblab.ai uses **SQLite** for data storage - no external database required!

```bash
# Generate Prisma client
npx prisma generate

# Optional: View database in web interface
npx prisma studio
```

The database will be automatically created and migrations applied when you first run the application.

---

## 🛠️ How Can I Contribute?

### 🐛 Report Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating a new issue
3. **Provide detailed information:** steps to reproduce, expected vs actual behavior, environment details

### 💡 Suggest Features

1. **Search existing feature requests** first
2. **Create a feature request issue** using our template
3. **Explain the problem** your feature would solve

### 💻 Code Contributions

1. **Choose an issue** or propose a new feature
2. **Comment on the issue** to let others know you're working on it
3. **Follow our development workflow** (see below)

---

## 🔄 Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **feature/issue-number-description**: New features
- **fix/issue-number-description**: Bug fixes
- **docs/description**: Documentation updates

### Making Changes

1. **Create a branch:**

   ```bash
   git checkout -b feature/123-add-new-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes:**

   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add new feature for X functionality"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 📥 Pull Request Process

### Before Submitting

- [ ] **Update documentation** if needed
- [ ] **Add or update tests** for new functionality
- [ ] **Run the full test suite** (`pnpm test`)
- [ ] **Check code style** (`pnpm lint`)
- [ ] **Keep changes focused** - one feature/fix per PR

### Review Process

1. **Automated checks** must pass
2. **Code review** by at least one core maintainer
3. **Address feedback** and make requested changes
4. **Final approval** and merge

---

## 📏 Coding Standards

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Define proper types** - avoid `any`
- **Use interfaces** for object shapes

### Code Style

- **Follow existing patterns** in the codebase
- **Use meaningful names** for variables and functions
- **Keep functions small** and focused
- **Comment complex logic**

### React/Remix Guidelines

- **Use functional components** with hooks
- **Follow React best practices**
- **Handle errors gracefully**

### CSS/Styling

- **Use UnoCSS** for styling
- **Follow atomic CSS principles**
- **Ensure responsive design**

---

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Writing Tests

- **Write tests** for new features and bug fixes
- **Use Vitest** as our testing framework
- **Test edge cases** and error conditions

---

## 🗄️ Database Development

### Working with the Database

```bash
# View/edit data in web interface
pnpm prisma studio

# Reset database (caution: deletes all data)
pnpm prisma migrate reset

# Create new migration after schema changes
pnpm prisma migrate dev --name your-migration-name

# Generate Prisma client after schema changes
pnpm prisma generate
```

### Schema Changes

1. **Edit `prisma/schema.prisma`**
2. **Create migration**: `pnpm prisma migrate dev --name describe-your-change`
3. **Update TypeScript types** if needed
4. **Test your changes** thoroughly

---

## 💬 Community & Communication

### Getting Help

- **🐛 [GitHub Issues](https://github.com/liblaber/ai/issues)** - Bug reports and feature requests
- **📧 [General Inquiries](mailto:community@liblab.ai)** - Contact us directly

### Communication Guidelines

- **Be respectful** and professional
- **Stay on topic** in discussions
- **Search before asking** to avoid duplicates
- **Provide context** when asking questions

---

## 🏆 Recognition

### Becoming a Core Maintainer

Interested in deeper involvement? See our [Governance Model](GOVERNANCE.md) for information about becoming a core maintainer.

---

**Thank you for contributing to liblab.ai!** 🚀
