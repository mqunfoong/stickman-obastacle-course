import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Level2Scene } from './scenes/Level2Scene.js';
import { Level3Scene } from './scenes/Level3Scene.js';

// Only scale to fit on mobile; desktop stays fixed 800x600
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window && window.innerWidth <= 1024);

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: 0x87CEEB, // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, // Match the gravity used in platform calculations
            debug: false
        }
    },
    scene: [MenuScene, GameScene, Level2Scene, Level3Scene],
    ...(isMobile ? {
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 600
        }
    } : {})
};

const game = new Phaser.Game(config);

// On mobile, refresh scale when viewport changes (e.g. orientation, address bar)
if (isMobile && game.scale) {
    const refreshScale = () => {
        game.scale.refresh();
    };
    window.addEventListener('resize', refreshScale);
    window.addEventListener('orientationchange', () => {
        setTimeout(refreshScale, 100);
    });
    // Fix initial layout after a short delay (helps some mobile browsers)
    setTimeout(refreshScale, 300);
}


