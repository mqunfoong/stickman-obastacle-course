import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        
        // Set background color
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        
        // --- Logo: draw a stylized stickman figure (centered at 0,0) ---
        const logoY = height * 0.36;
        const logoScale = 2.2;
        const g = this.add.graphics();
        
        g.lineStyle(5, 0xFFD700, 1);
        g.fillStyle(0xFFD700, 1);
        // Head
        g.fillCircle(0, -22, 10);
        g.lineStyle(4, 0xFFD700, 1);
        // Body
        g.lineBetween(0, -10, 0, 14);
        // Arms (raised)
        g.lineBetween(0, -5, -20, -22);
        g.lineBetween(0, -5, 20, -22);
        // Legs
        g.lineBetween(0, 14, -16, 38);
        g.lineBetween(0, 14, 16, 36);
        
        const logoContainer = this.add.container(centerX, logoY - 10, [g]);
        logoContainer.setScale(logoScale);
        
        this.tweens.add({
            targets: logoContainer,
            y: logoY - 18,
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Game name under the stickman (logo-style)
        const logoText = this.add.text(centerX, logoY + 75, 'STICKMAN', {
            fontSize: '42px',
            fontFamily: 'Arial',
            color: '#FFD700',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
            letterSpacing: 4
        });
        logoText.setOrigin(0.5, 0.5);
        
        const logoSub = this.add.text(centerX, logoY + 108, 'OBSTACLE COURSE', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            letterSpacing: 6
        });
        logoSub.setOrigin(0.5, 0.5);
        
        // --- Press SPACE to play ---
        const pressStyle = {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        };
        const pressText = this.add.text(centerX, height * 0.68, 'Press SPACE to play', pressStyle);
        pressText.setOrigin(0.5, 0.5);
        
        // Blink animation for "Press SPACE to play"
        this.tweens.add({
            targets: pressText,
            alpha: 0.4,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        const startGame = () => {
            if (this._gameStarted) return;
            this._gameStarted = true;
            this.tweens.killTweensOf([pressText]);
            pressText.setAlpha(1);
            this.tweens.add({
                targets: [logoContainer, logoText, logoSub, pressText],
                alpha: 0,
                duration: 280,
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        };
        
        const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        spaceKey.once('down', startGame);
        this.input.once('pointerdown', startGame);
    }
}
