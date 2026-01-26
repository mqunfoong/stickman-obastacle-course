import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Set background color
        this.cameras.main.setBackgroundColor(0x2C3E50); // Dark blue-gray
        
        // Title
        const titleStyle = {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        };
        
        const title = this.add.text(width / 2, 100, 'Stickman Obstacle Course', titleStyle);
        title.setOrigin(0.5, 0.5);
        
        // Subtitle
        const subtitleStyle = {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#CCCCCC'
        };
        
        const subtitle = this.add.text(width / 2, 160, 'Select a Level', subtitleStyle);
        subtitle.setOrigin(0.5, 0.5);
        
        // Level 1 Button
        const level1Button = this.add.rectangle(width / 2, height / 2 - 60, 300, 80, 0x3498DB);
        level1Button.setStrokeStyle(4, 0x2980B9);
        level1Button.setInteractive({ useHandCursor: true });
        
        const level1Text = this.add.text(width / 2, height / 2 - 60, 'Level 1', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        level1Text.setOrigin(0.5, 0.5);
        
        // Level 2 Button
        const level2Button = this.add.rectangle(width / 2, height / 2 + 20, 300, 80, 0xE74C3C);
        level2Button.setStrokeStyle(4, 0xC0392B);
        level2Button.setInteractive({ useHandCursor: true });
        
        const level2Text = this.add.text(width / 2, height / 2 + 20, 'Level 2', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        level2Text.setOrigin(0.5, 0.5);
        
        // Level 3 Button
        const level3Button = this.add.rectangle(width / 2, height / 2 + 100, 300, 80, 0xFF4500);
        level3Button.setStrokeStyle(4, 0xCC3300);
        level3Button.setInteractive({ useHandCursor: true });
        
        const level3Text = this.add.text(width / 2, height / 2 + 100, 'Level 3', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        level3Text.setOrigin(0.5, 0.5);
        
        // Button hover effects
        level1Button.on('pointerover', () => {
            level1Button.setFillStyle(0x5DADE2);
            this.tweens.add({
                targets: level1Button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        level1Button.on('pointerout', () => {
            level1Button.setFillStyle(0x3498DB);
            this.tweens.add({
                targets: level1Button,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        level2Button.on('pointerover', () => {
            level2Button.setFillStyle(0xEC7063);
            this.tweens.add({
                targets: level2Button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        level2Button.on('pointerout', () => {
            level2Button.setFillStyle(0xE74C3C);
            this.tweens.add({
                targets: level2Button,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        level3Button.on('pointerover', () => {
            level3Button.setFillStyle(0xFF6600);
            this.tweens.add({
                targets: level3Button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        level3Button.on('pointerout', () => {
            level3Button.setFillStyle(0xFF4500);
            this.tweens.add({
                targets: level3Button,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        // Button click handlers
        level1Button.on('pointerdown', () => {
            this.tweens.add({
                targets: level1Button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        });
        
        level2Button.on('pointerdown', () => {
            this.tweens.add({
                targets: level2Button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.start('Level2Scene');
                }
            });
        });
        
        level3Button.on('pointerdown', () => {
            this.tweens.add({
                targets: level3Button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.start('Level3Scene');
                }
            });
        });
        
        // Keyboard shortcuts - Use number keys (1, 2, and 3)
        // Key code 49 = '1', Key code 50 = '2', Key code 51 = '3'
        const key1 = this.input.keyboard.addKey(49);
        const key2 = this.input.keyboard.addKey(50);
        const key3 = this.input.keyboard.addKey(51);
        
        key1.on('down', () => {
            this.scene.start('GameScene');
        });
        
        key2.on('down', () => {
            this.scene.start('Level2Scene');
        });
        
        key3.on('down', () => {
            this.scene.start('Level3Scene');
        });
        
        // Instructions
        const instructionStyle = {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#95A5A6'
        };
        
        const instructions = this.add.text(width / 2, height - 40, 'Press 1 for Level 1, 2 for Level 2, 3 for Level 3', instructionStyle);
        instructions.setOrigin(0.5, 0.5);
    }
}
