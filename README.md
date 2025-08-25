# CommitSmith 🛠️

> **Simplified MCP Server for AI-powered Commit Generation**

CommitSmith is a Model Context Protocol (MCP) server that provides AI assistants with a single intelligent tool to generate high-quality conventional commit messages. Instead of generating commits itself, it empowers AI assistants like Claude to understand your code changes and craft perfect commit messages according to your preferences through natural language requests.

## 🌟 What makes CommitSmith different?

- **True MCP Architecture**: Provides tools for AI, doesn't replace AI
- **Single Intelligent Tool**: Natural language requests determine behavior automatically
- **Smart Auto-Handling**: Intelligently manages unstaged files with confirmation flow
- **Streamlined**: Focused on commit message generation without unnecessary complexity
- **IDE Integration**: Works with VS Code, vim, emacs, and any git-enabled editor
- **Flexible Workflows**: Interactive, prepare-for-review, or auto-commit modes

## 🚀 Quick Start

### Installation

```bash
# Via npm
npm install -g commit-smith

# Via Docker
docker pull commitsmith/commit-smith

# From source
git clone https://github.com/commit-smith/commit-smith.git
cd commit-smith
pnpm install && pnpm build
```

### Basic Usage with Claude

1. **Add to your MCP client configuration** (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "commit-smith": {
      "command": "commit-smith",
      "args": []
    }
  }
}
```

2. **Stage your changes** (optional - CommitSmith can handle unstaged files):
```bash
git add .
```

3. **Ask Claude with natural language**:
```
"Generate a short commit message for my changes"
```

Or for more complex requests:
```
"Create a detailed commit and commit it automatically"
```

Claude will automatically:
- Analyze your changes (staged and unstaged)
- Parse your natural language request to determine commit style
- Handle unstaged files intelligently (auto-stage or ask for confirmation)
- Generate a perfect conventional commit message
- Validate the message against conventional commit rules
- Prepare the message in .git/COMMIT_EDITMSG for review
- Optionally auto-commit when requested

## 🎯 Natural Language Examples

### Basic Requests
- `"Generate a commit message for my changes"`
- `"Create a short commit message"`
- `"Make a detailed commit for my work"`

### Style-Specific Requests
- `"Generate a minimal commit message"` (single line only)
- `"Create a strict commit with proper validation"` (enterprise-grade)
- `"Make a descriptive commit with context"` (detailed explanations)

### Auto-Commit Requests
- `"Generate a commit and commit it automatically"`
- `"Create a short commit and commit it"`
- `"Auto-commit my detailed changes"`

### Unstaged File Handling
- `"Generate a commit for my changes"` (auto-stages unstaged files)
- `"Create a commit without staging files"` (asks for confirmation)

## 🛠️ The Single `commit` Tool

### Schema
```typescript
{
  request: string,        // Natural language description of desired commit
  auto_commit?: boolean,  // Whether to auto-commit (default: true)
  auto_stage?: boolean   // Whether to stage unstaged files (default: true)
}
```

### Parameters

- **`request`** (required): Natural language description of what you want
  - Examples: `"Generate a short commit message"`, `"Create a detailed commit and commit it"`
  - The AI automatically determines commit style, auto-commit behavior, and staging preferences

- **`auto_commit`** (optional, default: `true`): Whether to automatically commit after preparing the message
  - Set to `true` for fully automated workflows (default behavior)
  - Set to `false` for manual review in your IDE

- **`auto_stage`** (optional, default: `true`): Whether to automatically stage unstaged files
  - Set to `true` to automatically include all unstaged changes
  - Set to `false` to get a confirmation request with file list

### Behavior

#### Smart Natural Language Processing
The tool parses your request to automatically determine:
- **Commit Style**: `short`, `detailed`, `strict`, or `default`
- **Auto-commit**: Whether to commit automatically or prepare for review
- **Auto-staging**: Whether to stage unstaged files or ask for confirmation

#### Unstaged File Handling
- **When `auto_stage: true`**: Automatically stages all unstaged files
- **When `auto_stage: false`**: Returns a confirmation request with the list of unstaged files
- **No staged changes**: Returns an error if no changes are found

#### Validation and Preparation
- Validates generated messages using conventional commit rules
- Prepares valid messages in `.git/COMMIT_EDITMSG` for IDE review
- Provides detailed error messages for invalid commits

## 📚 Resources for AI

- **`commit://agent-definition`** - Complete AI behavior prompt
- **`commit://presets`** - Available agent presets for different commit styles

## 💡 Usage Patterns

### Interactive Review (Recommended)
```
User: "Generate a short commit message for my changes"

AI:
1. Analyzes staged and unstaged changes
2. Parses "short" request → uses minimal style
3. Generates single-line commit message
4. Validates against conventional commit rules
5. prepare_commit_message → ready for your review
6. "Message prepared in .git/COMMIT_EDITMSG - review in your IDE!"
```

### Auto-Commit
```
User: "Create a detailed commit and commit it automatically"

AI:
1. Analyzes all changes
2. Parses "detailed" and "commit it" → uses descriptive style + auto_commit
3. Generates detailed commit message with body
4. Validates message
5. prepare_commit_message
6. commit_with_message → executes the commit
7. "Committed successfully: abc123"
```

### Confirmation Flow for Unstaged Files
```
User: "Generate a commit without staging files"

AI:
1. Detects unstaged files
2. Returns confirmation request:
   {
     "needs_confirmation": true,
     "message": "Found 3 unstaged files. Please confirm if you want to stage them:",
     "unstaged_files": ["file1.js", "file2.js", "file3.js"],
     "suggestion": "You can call the commit tool again with auto_stage: true to automatically stage these files."
   }
```

## 🔗 IDE Integration

### VS Code
1. AI generates message via `commit` tool
2. Open Source Control panel
3. Message is pre-filled in the commit message editor
4. Edit if needed and click Commit

### Command Line
```bash
# After commit tool prepares message
git commit -e  # Opens editor with pre-filled message
```

### JetBrains IDEs / Vim / Emacs
Works with any IDE that reads `.git/COMMIT_EDITMSG`

## 📖 Advanced Examples

### Complex Natural Language Requests
```
User: "I made significant changes to the authentication system, 
       including JWT validation, refresh tokens, and error handling. 
       Create a strict commit and commit it automatically"

AI:
1. Parses "strict" → uses strict preset (enterprise-grade)
2. Parses "commit it automatically" → sets auto_commit: true
3. Generates detailed commit message with exactly 2-3 bullet points
4. Validates against strict rules
5. Auto-commits the changes
```

### Error Handling
```
User: "Generate a commit message"

AI (if validation fails):
{
  "success": false,
  "validation_errors": [...],
  "formatted_errors": "Subject must be under 50 characters",
  "suggestion": "The generated commit message doesn't meet the validation requirements. Please try a different approach."
}
```

## 🧪 Development

### Setup
```bash
git clone https://github.com/commit-smith/commit-smith.git
cd commit-smith
pnpm install
```

### Testing
```bash
pnpm test              # Run all tests
pnpm run test:watch    # Watch mode
pnpm run test:coverage # Coverage report
```

### Building
```bash
pnpm build         # Compile TypeScript
pnpm run dev           # Development mode
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by [Conventional Commits](https://www.conventionalcommits.org/)
- Git operations powered by [simple-git](https://github.com/steveukx/git-js)

## 🔗 Links

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop Setup](https://claude.ai/desktop)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitlint Configuration](https://commitlint.js.org/)
- [Issues & Feature Requests](https://github.com/commit-smith/commit-smith/issues)

---

**Made with ❤️ for developers who care about commit quality**
