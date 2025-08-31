# Tethra - AI Chat Application

A unified AI chat application that lets you use a beautiful local interface while sharing your conversations through the web. Chat locally, share globally.

## ✨ Core Features

### 🌐 Web Sharing
- **Share Any Chat** - Generate shareable links for any conversation
- **Public Conversations** - Make your chats accessible to anyone with the link
- **Real-time Updates** - Changes sync instantly between local and web versions
- **No Account Required** - Recipients can view shared chats without signing up

### 🤖 Multi-Model AI Support
- **Claude** (Anthropic) - Advanced reasoning and analysis
- **GPT-4/3.5** (OpenAI) - Creative writing and coding assistance  
- **Gemini** (Google) - Multimodal capabilities and research
- **Extensible** - Easy to add new AI providers

### 💻 Local-First Experience
- **Desktop App** - Native performance with Tauri
- **Offline Capable** - Works without internet connection
- **Privacy Focused** - Your data stays on your device
- **Fast & Responsive** - Instant chat switching and smooth interactions

### 🎨 Modern Interface
- **Clean Design** - Minimalist dark theme
- **Keyboard Shortcuts** - Ctrl+N for new chat, Ctrl+, for settings
- **Conversation Management** - Archive, delete, and organize chats
- **Model Selection** - Easy switching between AI providers

## 🚀 How It Works

### Local Chat Experience
1. **Create conversations** in your local Tethra app
2. **Chat with AI models** using your preferred interface
3. **Organize and manage** your conversations locally

### Web Sharing
1. **Generate share link** for any conversation
2. **Share the URL** with anyone
3. **Recipients view** the chat in their browser
4. **Real-time sync** keeps everything up to date

```typescript
// Example: Sharing a conversation
const shareUrl = `${origin}/shared/${conversationId}`;
// Anyone can visit this URL to view the chat
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety
- **TanStack Router** - File-based routing
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - High-quality components

### Backend
- **Tauri** - Cross-platform desktop framework
- **Rust** - High-performance backend
- **SQLite** - Local conversation storage
- **WebSocket** - Real-time streaming

### AI Integration
- **Vercel AI SDK** - Unified AI provider interface
- **Streaming Support** - Real-time AI responses
- **Multi-Provider** - OpenAI, Anthropic, Google, and more

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Rust (for Tauri development)
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd tethra-next
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Add your API keys for OpenAI, Anthropic, Google, etc.
```

4. **Run in development mode**
```bash
npm run dev
```

### Building for Production

```bash
# Build the application
npm run build

# Build for specific platform
npm run tauri build
```

## 🔧 Configuration

### API Keys
Add your AI provider API keys to the `.env` file:

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
```

### Settings
Access settings via `Ctrl+,` or the settings menu:
- **Providers**: Configure AI model access
- **Appearance**: Customize theme and layout
- **General**: Application preferences
- **Sharing**: Configure web sharing options

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── chat/           # Chat interface components
│   ├── ui/             # Reusable UI components
│   └── icons/          # AI provider icons
├── lib/                # Utility functions
│   ├── chat.ts         # Chat API functions
│   └── chat-cache.ts   # Local caching system
├── routes/             # TanStack Router pages
│   └── shared/         # Web sharing routes
├── hooks/              # Custom React hooks
└── styles/             # Global styles and themes
```

## 🌐 Web Sharing Architecture

### Local App
- **Desktop interface** for creating and managing chats
- **Local storage** for conversations and settings
- **AI integration** for real-time responses
- **Share link generation** for any conversation

### Web Interface
- **Public viewing** of shared conversations
- **Read-only access** to chat content
- **Responsive design** for any device
- **No authentication required** for viewing

### Sync Mechanism
- **Real-time updates** when local changes are made
- **WebSocket connection** for live synchronization
- **Optimistic updates** for smooth user experience

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TanStack** - Excellent routing and state management
- **Shadcn/ui** - Beautiful component library
- **Tauri** - Cross-platform desktop framework
- **Vercel AI SDK** - Unified AI integration

---

**Tethra** - Chat locally, share globally. 🌐

## 📋 Development Status & TODO

| **Category** | **Feature** | **Status** | **Priority** | **Description** |
|-------------|-------------|------------|--------------|-----------------|
| **Core Chat** | Multi-Model AI Support | ✅ Complete | High | OpenAI, Anthropic, Google, extensible providers |
| **Core Chat** | Real-time Streaming | ✅ Complete | High | Live AI response streaming with error handling |
| **Core Chat** | Conversation Management | ✅ Complete | High | Create, archive, delete, organize conversations |
| **Core Chat** | Message History | ✅ Complete | High | Persistent storage and retrieval |
| **Core Chat** | Model Selection | ✅ Complete | Medium | Easy switching between AI providers |
| **Core Chat** | Keyboard Shortcuts | ✅ Complete | Medium | Ctrl+N for new chat, Ctrl+, for settings |
| **Performance** | Client-Side Caching | ✅ Complete | High | 5-minute TTL cache for messages and conversations |
| **Performance** | Instant Chat Switching | ✅ Complete | High | Near-zero latency for cached chats |
| **Performance** | Intelligent Preloading | ✅ Complete | Medium | Background loading of recent/adjacent chats |
| **Performance** | Scroll Position Memory | ✅ Complete | Medium | Remembers exact scroll position per chat |
| **Performance** | Optimistic Updates | ✅ Complete | Medium | Messages appear instantly, sync in background |
| **Performance** | Debounced Operations | ✅ Complete | Low | Prevents excessive API calls and cache updates |
| **UI/UX** | Modern Dark Theme | ✅ Complete | High | Clean, minimalist interface with consistent styling |
| **UI/UX** | Responsive Design | ✅ Complete | High | Works seamlessly across different screen sizes |
| **UI/UX** | Loading States | ✅ Complete | Medium | Smooth loading indicators and skeleton screens |
| **UI/UX** | Error Handling | ✅ Complete | Medium | Graceful error states and user-friendly messages |
| **UI/UX** | Settings Panel | ✅ Complete | Medium | Comprehensive configuration options |
| **UI/UX** | Conversation Sidebar | ✅ Complete | Medium | Easy navigation between chats |
| **Infrastructure** | Tauri Desktop App | ✅ Complete | High | Cross-platform native application |
| **Infrastructure** | TypeScript Integration | ✅ Complete | High | Full type safety throughout the application |
| **Infrastructure** | TanStack Router | ✅ Complete | High | File-based routing with type safety |
| **Infrastructure** | Tailwind CSS + Shadcn/ui | ✅ Complete | Medium | Modern styling and component library |
| **Infrastructure** | Local Database | ✅ Complete | High | SQLite storage for conversations and settings |
| **Web Sharing** | Share Link Generation | 🔄 In Progress | Critical | Creating unique URLs for conversations |
| **Web Sharing** | Web Interface Development | 🔄 In Progress | Critical | Public viewing interface for shared chats |
| **Web Sharing** | Real-time Sync | 🔄 In Progress | Critical | WebSocket connection between local app and web |
| **Web Sharing** | Authentication System | 🔄 In Progress | High | Optional user accounts for enhanced features |
| **AI Features** | File Upload Support | 🔄 In Progress | Medium | Ability to upload and analyze documents |
| **AI Features** | Image Generation | 🔄 In Progress | Medium | Integration with DALL-E, Midjourney, or similar |
| **AI Features** | Voice Input/Output | 🔄 In Progress | Low | Speech-to-text and text-to-speech capabilities |
| **AI Features** | Code Execution | 🔄 In Progress | Low | Safe code running environment for AI-generated code |
| **Web Sharing** | Public Chat Discovery | ⏳ Planned | High | Browse and discover public conversations |
| **Web Sharing** | Collaborative Editing | ⏳ Planned | Medium | Multiple users can contribute to shared chats |
| **Web Sharing** | Chat Embedding | ⏳ Planned | Medium | Embed conversations in websites and blogs |
| **Web Sharing** | Export Options | ⏳ Planned | Medium | PDF, Markdown, and other format exports |
| **Web Sharing** | Chat Analytics | ⏳ Planned | Low | View counts, engagement metrics for shared chats |
| **Web Sharing** | Custom Domains | ⏳ Planned | Low | Use your own domain for shared conversations |
| **AI Capabilities** | Multi-Modal Support | ⏳ Planned | High | Handle images, audio, and video inputs |
| **AI Capabilities** | Custom AI Models | ⏳ Planned | Medium | Integration with local or custom AI models |
| **AI Capabilities** | AI Memory | ⏳ Planned | Medium | Persistent context across conversations |
| **AI Capabilities** | Prompt Templates | ⏳ Planned | Medium | Reusable prompt structures and workflows |
| **AI Capabilities** | AI Agent Framework | ⏳ Planned | Low | Create autonomous AI agents for specific tasks |
| **AI Capabilities** | Fine-tuned Models | ⏳ Planned | Low | Support for custom fine-tuned AI models |
| **User Experience** | Conversation Folders | ⏳ Planned | Medium | Organize chats into folders and categories |
| **User Experience** | Search & Filtering | ⏳ Planned | High | Advanced search across all conversations |
| **User Experience** | Conversation Templates | ⏳ Planned | Low | Pre-built conversation starters |
| **User Experience** | Custom Themes | ⏳ Planned | Low | User-defined color schemes and themes |
| **User Experience** | Accessibility Features | ⏳ Planned | Medium | Screen reader support, high contrast modes |
| **Mobile** | Mobile App | ⏳ Planned | High | iOS and Android applications |
| **Mobile** | Progressive Web App | ⏳ Planned | Medium | Installable web application |
| **Mobile** | Browser Extension | ⏳ Planned | Low | Chrome, Firefox, Safari extensions |
| **Mobile** | Desktop Widgets | ⏳ Planned | Low | System tray integration and notifications |
| **Mobile** | CLI Interface | ⏳ Planned | Low | Command-line interface for power users |
| **Enterprise** | Team Workspaces | ⏳ Planned | Medium | Shared workspaces for teams and organizations |
| **Enterprise** | Role-based Access | ⏳ Planned | Medium | Admin, editor, viewer permissions |
| **Enterprise** | Audit Logs | ⏳ Planned | Low | Track changes and user activity |
| **Enterprise** | API Integration | ⏳ Planned | Medium | REST API for third-party integrations |
| **Enterprise** | SSO Integration | ⏳ Planned | Low | Single sign-on with enterprise identity providers |
| **Enterprise** | Data Retention Policies | ⏳ Planned | Low | Configurable data retention and deletion |
| **Technical** | End-to-End Encryption | ⏳ Planned | High | Encrypted conversations and data |
| **Technical** | Offline Mode | ⏳ Planned | Medium | Full functionality without internet connection |
| **Technical** | Sync Across Devices | ⏳ Planned | Medium | Seamless synchronization between devices |
| **Technical** | Backup & Restore | ⏳ Planned | Low | Automated backup and recovery systems |
| **Technical** | Plugin System | ⏳ Planned | Low | Extensible architecture for third-party plugins |
| **Technical** | Performance Monitoring | ⏳ Planned | Low | Real-time performance metrics and optimization |
| **Community** | Public Chat Directory | ⏳ Planned | Medium | Discover and explore public conversations |
| **Community** | User Profiles | ⏳ Planned | Medium | Public profiles for chat creators |
| **Community** | Following System | ⏳ Planned | Low | Follow favorite chat creators |
| **Community** | Comments & Reactions | ⏳ Planned | Low | Engage with shared conversations |
| **Community** | Chat Collections | ⏳ Planned | Low | Curated collections of related conversations |
| **Community** | Community Guidelines | ⏳ Planned | Low | Moderation tools and content policies |

### 🎯 **Development Phases**

| **Phase** | **Focus** | **Timeline** | **Key Features** |
|-----------|-----------|--------------|------------------|
| **Phase 1** | Core Web Sharing | Current | Share links, web interface, real-time sync, auth |
| **Phase 2** | Enhanced Features | Q2 2024 | File upload, mobile responsiveness, export, search |
| **Phase 3** | Collaboration & Social | Q3 2024 | Public directory, user profiles, comments, teams |
| **Phase 4** | Enterprise & Advanced | Q4 2024 | SSO, API platform, plugins, multi-modal AI |

### 🐛 **Known Issues & Technical Debt**

| **Category** | **Issue** | **Severity** | **Status** | **Description** |
|-------------|-----------|--------------|------------|-----------------|
| **Performance** | Memory Usage | Medium | 🔧 In Progress | Optimize memory consumption for large histories |
| **Performance** | Bundle Size | Low | 🔧 Planned | Reduce application bundle size for faster loading |
| **Performance** | Database Optimization | Medium | 🔧 Planned | Improve query performance for large datasets |
| **Performance** | Cache Invalidation | Low | 🔧 Planned | More sophisticated cache invalidation strategies |
| **UX** | Error Recovery | Medium | 🔧 Planned | Better error recovery and retry mechanisms |
| **UX** | Loading States | Low | 🔧 Planned | More granular loading states for different operations |
| **UX** | Accessibility | Medium | 🔧 Planned | Improve accessibility compliance (WCAG 2.1) |
| **UX** | Internationalization | Low | 🔧 Planned | Multi-language support and localization |
| **Security** | Input Validation | High | 🔧 Planned | Enhanced input validation and sanitization |
| **Security** | Rate Limiting | Medium | 🔧 Planned | Implement rate limiting for API calls |
| **Security** | Data Privacy | High | 🔧 Planned | Enhanced privacy controls and data handling |
| **Security** | Security Auditing | Medium | 🔧 Planned | Regular security audits and vulnerability assessments |

### 📊 **Development Metrics**

| **Metric** | **Target** | **Current** | **Status** |
|------------|------------|-------------|------------|
| **Code Coverage** | 80%+ | 45% | 🔧 In Progress |
| **Performance (Cached)** | < 100ms | ~50ms | ✅ On Track |
| **Performance (Network)** | < 500ms | ~300ms | ✅ On Track |
| **Accessibility** | WCAG 2.1 AA | Partial | 🔧 In Progress |
| **Security Audits** | Quarterly | Not Started | 🔧 Planned |
| **Documentation** | Comprehensive | Basic | 🔧 In Progress |

### 🚀 **Quick Status Summary**

- **✅ Complete**: 24 features (Core functionality, performance optimizations, UI/UX)
- **🔄 In Progress**: 8 features (Web sharing implementation, enhanced AI features)
- **⏳ Planned**: 42 features (Comprehensive roadmap across all categories)
- **🔧 Technical Debt**: 12 issues (Performance, UX, security improvements)

**Next Milestone**: Complete Phase 1 (Core Web Sharing) - Share link generation, web interface, and real-time sync.
