# NotJS React Library Setup

## Project Structure

Your project has been restructured as a monorepo:

```
notjs/
├── packages/
│   ├── notjs-react/          # The npm library
│   │   ├── src/
│   │   │   ├── index.ts      # Main export
│   │   │   └── NotJS.tsx     # Component
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── README.md
│   │   └── .npmignore
│   ├── demo-app/              # Testing/demo app
│   │   └── (your current frontend)
│   └── package.json           # Workspace config
├── .github/
│   └── workflows/
│       └── publish.yml        # Auto-publish to npm
└── src/                       # Spring Boot backend (unchanged)
```

## Initial Setup

### 1. Install Dependencies

```bash
cd packages
npm install
```

This will install dependencies for both the library and demo app using npm workspaces.

### 2. Build the Library

```bash
cd packages/notjs-react
npm run build
```

This creates the distributable files in `packages/notjs-react/dist/`.

### 3. Run the Demo App

```bash
cd packages/demo-app
npm run dev
```

The demo app now imports from the `notjs-react` library instead of the local component.

## Development Workflow

### Testing Changes Locally

1. Make changes to `packages/notjs-react/src/NotJS.tsx`
2. Rebuild the library: `npm run build` (in notjs-react directory)
3. The demo app will automatically use the updated library

### Quick Development Scripts

From the `packages` directory:

```bash
# Build the library
npm run build:lib

# Run demo app
npm run dev:demo

# Build demo app
npm run build:demo
```

## Publishing to npm

### Prerequisites

1. Create an npm account at [npmjs.com](https://npmjs.com)
2. Generate an npm access token:
   - Go to npmjs.com → Account Settings → Access Tokens
   - Generate a new token with "Automation" type
3. Add the token to GitHub:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN` with your token value

### Publishing Process

There are two ways to publish:

#### Option 1: Automatic (Recommended)

Create a git tag and push it:

```bash
# Update version in packages/notjs-react/package.json first
cd packages/notjs-react
npm version patch  # or minor, major

# Push the tag
git push origin --tags
```

GitHub Actions will automatically build and publish to npm.

#### Option 2: Manual

```bash
cd packages/notjs-react
npm run build
npm login
npm publish --access public
```

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes

## Using the Published Library

Once published, users can install it:

```bash
npm install notjs-react
```

And use it in their React apps:

```tsx
import { NotJS } from 'notjs-react'

function App() {
  return (
    <NotJS
      apiBaseUrl="http://your-server.com/api"
      websocketUrl="ws://your-server.com/terminal"
      initialLanguage="java"
      initialVersion="25"
    />
  )
}
```

## Important Notes

### Before First Publish

1. **Update package.json**: Edit `packages/notjs-react/package.json`:
   - Change `author` field
   - Update `repository.url` to your GitHub repo
   - Review the version number

2. **Update README**: Edit `packages/notjs-react/README.md` with:
   - Your server setup instructions
   - API documentation
   - Examples

3. **Check package name availability**: Search npmjs.com for "notjs-react" to ensure it's available

### After Publishing

- The library will be available at: `https://www.npmjs.com/package/notjs-react`
- Users can view documentation at that URL
- You can unpublish within 72 hours if needed: `npm unpublish notjs-react@version`

## Troubleshooting

### Build Errors

If you get TypeScript errors during build:
```bash
cd packages/notjs-react
npm install
npm run build
```

### Demo App Not Finding Library

```bash
cd packages
rm -rf node_modules package-lock.json
rm -rf */node_modules */package-lock.json
npm install
```

### Publish Fails

- Ensure you're logged in: `npm whoami`
- Check token permissions in GitHub Secrets
- Verify package name is available on npmjs.com
- Make sure version number was updated

## Maintenance

### Keeping Dependencies Updated

```bash
# In library
cd packages/notjs-react
npm update

# In demo app
cd packages/demo-app
npm update
```

### Adding New Features

1. Add feature to `packages/notjs-react/src/NotJS.tsx`
2. Update TypeScript types if needed
3. Rebuild: `npm run build`
4. Test in demo app
5. Update version in package.json
6. Create git tag and push to trigger publish

## Support

For issues or questions:
- Library issues: GitHub Issues
- Server setup: https://github.com/cholnhial/notjs