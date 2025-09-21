# DynamoDB Manager 🚀

A modern, powerful, and **completely free** desktop application for managing DynamoDB databases. Built with Svelte 5, SvelteKit, and Electron to provide a Studio 3T-like experience for DynamoDB operations.

## 🌟 Why DynamoDB Manager?

While the market is flooded with expensive DynamoDB clients that charge premium prices for basic functionality, **DynamoDB Manager** offers a comprehensive solution that's:

- ✅ **100% Free & Open Source** - No subscriptions, no feature limitations
- ✅ **Docker-Ready** - Perfect for development with DynamoDB Local containers
- ✅ **Production-Ready** - Connect to real AWS DynamoDB instances with full security
- ✅ **Cross-Platform** - Windows, macOS, and Linux support
- ✅ **Modern Interface** - Clean, intuitive design inspired by MongoDB Studio 3T
- ✅ **Full CRUD Operations** - Create, Read, Update, Delete with advanced features

## 🎯 Features

### 🔗 Connection Management
- **Multiple simultaneous connections** - Work with several DynamoDB instances at once
- **Secure credential storage** - Your AWS keys are stored locally and securely
- **Connection testing** - Automatic validation before connecting
- **Docker support** - Seamlessly connect to DynamoDB Local containers
- **Auto-reconnection** - Smart retry mechanism for interrupted connections

### 📊 Data Operations
- **Advanced table explorer** - Browse all tables with schema information
- **Dual view modes** - Switch between table view and JSON view instantly
- **Smart pagination** - Navigate large datasets efficiently
- **Powerful filtering** - Search and filter data by any field
- **Export capabilities** - Download your data as JSON for backup
- **Batch operations** - Handle multiple records efficiently

### 🛠️ Developer Experience
- **Tab-based interface** - Work with multiple tables simultaneously
- **Syntax highlighting** - JSON data with beautiful color coding
- **Real-time validation** - DynamoDB type checking (S, N, BOOL, etc.)
- **Error handling** - Clear error messages and recovery suggestions
- **Performance optimized** - Fast loading even with large datasets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Draka/dynamodb-manager.git
   cd dynamodb-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   # Web version
   npm run dev

   # Desktop application
   npm run electron:dev
   ```

4. **Build for production**
   ```bash
   # Web build
   npm run build

   # Desktop application
   npm run electron:build
   ```

### 🐳 Using with Docker DynamoDB Local

Perfect for development! Run DynamoDB Local in a container:

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# In DynamoDB Manager, connect with:
# - Region: us-east-1
# - Access Key: dummy
# - Secret Key: dummy
# - Endpoint: http://localhost:8000
```

### ☁️ Connecting to AWS DynamoDB

1. Click "New Connection"
2. Enter your AWS credentials:
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: Your preferred AWS region (e.g., us-east-1)
3. Click "Test Connection" to verify
4. Start managing your tables!

## 📸 Screenshots

[Add screenshots here showing the main interface, connection form, table view, etc.]

## 🏗️ Architecture

- **Frontend**: Svelte 5 + SvelteKit 2.22.0
- **Desktop**: Electron 38.0.0 + electron-builder
- **Styling**: TailwindCSS 4.0 + Lucide Icons
- **AWS Integration**: @aws-sdk/client-dynamodb + @aws-sdk/lib-dynamodb
- **Build System**: Vite 7.0.4

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🍴 Fork & Submit Changes

1. **Fork the repository**
   - Click the "Fork" button at the top of this repository
   - Clone your fork: `git clone https://github.com/yourusername/dynamodb-manager.git`

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

5. **Submit a Pull Request**
   - Push to your fork: `git push origin feature/amazing-feature`
   - Open a Pull Request with a clear description of your changes

### 🐛 Bug Reports & Feature Requests

- **Bug Reports**: Use the GitHub Issues tab with the "bug" label
- **Feature Requests**: Use the GitHub Issues tab with the "enhancement" label
- **Questions**: Use the GitHub Discussions tab

### 💡 Development Guidelines

- Follow the existing code patterns and naming conventions
- Write clear commit messages
- Keep pull requests focused on a single feature/fix
- Add JSDoc comments for new functions
- Test on multiple platforms when possible

## 📚 Available Scripts

```bash
# Development
npm run dev                    # Web development server (localhost:5174)
npm run electron:dev           # Electron development mode

# Building
npm run build                  # Production web build
npm run preview                # Preview production build
npm run electron:pack          # Local Electron packaging
npm run electron:build         # Multi-platform Electron build
npm run electron:build-win     # Windows-specific build
npm run electron:build-mac     # macOS-specific build
npm run electron:build-linux   # Linux-specific build

# Quality
npm run test                   # Run unit tests (Vitest)
npm run test:e2e               # Run E2E tests (Playwright)
npm run lint                   # ESLint code analysis
npm run format                 # Prettier code formatting
```

## 🛡️ Security

- **Local storage**: All credentials are stored locally on your machine
- **No telemetry**: We don't collect any usage data
- **AWS best practices**: Follows AWS SDK security guidelines
- **Open source**: Full transparency - inspect the code yourself

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by MongoDB's Studio 3T interface design
- Built on the amazing Svelte and Electron ecosystems
- Thanks to the AWS SDK team for excellent DynamoDB support
- Special thanks to all contributors who help make this tool better

## 📞 Support

- 📖 **Documentation**: Check the [docs folder](./docs) for detailed guides
- 🐛 **Issues**: Report bugs via [GitHub Issues](https://github.com/Draka/dynamodb-manager/issues)
- 💬 **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/Draka/dynamodb-manager/discussions)
- ⭐ **Star the repo** if you find it useful!

---

**Made with ❤️ by developers, for developers. Free forever.**

> *"Because good tools shouldn't cost a fortune."*
