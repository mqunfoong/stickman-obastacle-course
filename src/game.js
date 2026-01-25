import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Level2Scene } from './scenes/Level2Scene.js';
import { Level3Scene } from './scenes/Level3Scene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'body',
    backgroundColor: 0x87CEEB, // Sky blue background
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, // Match the gravity used in platform calculations
            debug: false
        }
    },
    scene: [MenuScene, GameScene, Level2Scene, Level3Scene]
};

const game = new Phaser.Game(config);


