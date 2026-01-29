import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Level2Scene } from './scenes/Level2Scene.js';
import { Level3Scene } from './scenes/Level3Scene.js';

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 768 && 'ontouchstart' in window);

// Calculate responsive dimensions
let gameWidth = 800;
let gameHeight = 600;

if (isMobile) {
    // On mobile, use screen dimensions but maintain aspect ratio
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const aspectRatio = 800 / 600;
    
    if (maxWidth / maxHeight > aspectRatio) {
        // Screen is wider - fit to height
        gameHeight = maxHeight;
        gameWidth = gameHeight * aspectRatio;
    } else {
        // Screen is taller - fit to width
        gameWidth = maxWidth;
        gameHeight = gameWidth / aspectRatio;
    }
}

const config = {
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    parent: 'body',
    backgroundColor: 0x87CEEB, // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, // Match the gravity used in platform calculations
            debug: false
        }
    },
    scene: [MenuScene, GameScene, Level2Scene, Level3Scene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);


