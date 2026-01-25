# Bloop Obstacle Course

A Phaser.js game featuring multiple levels with different themes.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173` (or the port shown in terminal)

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploying to Railway

### Prerequisites
- A GitHub account
- A Railway account (sign up at https://railway.app)

### Steps to Deploy

1. **Push your code to GitHub:**
   - If you don't have Git installed, download it from https://git-scm.com/downloads or use GitHub Desktop
   - Create a new repository on GitHub
   - Initialize git in your project folder (if not already done):
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     ```
   - Connect to your GitHub repository:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
     git branch -M main
     git push -u origin main
     ```

2. **Deploy on Railway:**
   - Go to https://railway.app and sign in
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect the project and deploy it
   - Once deployed, Railway will provide you with a public URL

3. **Configure the Port (if needed):**
   - Railway automatically sets the `PORT` environment variable
   - The start script is already configured to use this port

## Project Structure

```
├── src/
│   ├── game.js              # Main game configuration
│   └── scenes/
│       ├── MenuScene.js     # Main menu
│       ├── GameScene.js     # Level 1
│       ├── Level2Scene.js   # Level 2 (Snow theme)
│       └── Level3Scene.js   # Level 3
├── assets/
│   ├── images/              # Game images
│   └── sounds/              # Game audio
├── index.html               # Entry point
└── package.json             # Dependencies and scripts
```

## Technologies Used

- Phaser.js 3.90.0 - Game framework
- Vite 7.3.0 - Build tool and dev server
