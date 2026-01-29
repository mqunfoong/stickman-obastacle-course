import Phaser from 'phaser';

// Level 3 Scene - Lava themed level
// Global flag to track if background music has been initialized
let backgroundMusicInitialized = false;
let globalBackgroundMusic = null;

export class Level3Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Level3Scene' });
    }

    preload() {
        // Load background music (same as Level 1 and 2, use absolute path for Vite)
        const musicPath = '/assets/sounds/background.mp3';
        console.log('Level 3: Attempting to load music from:', musicPath);
        
        this.load.audio('backgroundMusic', musicPath);
        
        // Load hit sound effect (use absolute path for Vite)
        const hitSoundPath = '/assets/sounds/hit.mp3';
        this.load.audio('hitSound', hitSoundPath);
        
        // Load victory sound effect (use absolute path for Vite)
        const victorySoundPath = '/assets/sounds/victory.mp3';
        this.load.audio('victorySound', victorySoundPath);
    }

    create() {
        console.log('Level3Scene create() function called!');
        
        try {
            // Set dark, fiery background color for lava level
            this.cameras.main.setBackgroundColor(0x2A1A1A); // Dark red-brown, like volcanic ash
            
            // Reset camera position
            this.cameras.main.setScroll(0, 0);
            
            // Set world bounds - make the world much wider than the screen
            this.physics.world.setBounds(0, 0, 4000, 1000, true, true, false, false);
            
            // Create lava-themed background elements first (behind everything)
            this.createLavaBackground();
            
            // Create the stickman player first
            this.createStickman();
            
            // Create ground and platforms (lava/rock themed)
            this.createGroundAndPlatforms();
            
            // Create lava pond textures
            this.createLavaPondTexture();
            
            // Create lava ponds with damage mechanics
            this.createLavaPonds();
            
            // Create lava crab texture
            this.createLavaCrabTexture();
            
            // Create lava crabs
            this.createLavaCrabs();
            
            // Create lava bird texture
            this.createLavaBirdTexture();
            
            // Create fireball texture
            this.createFireballTexture();
            
            // Create lava birds
            this.createLavaBirds();
            
            // Create lava worm texture
            try {
                this.createLavaWormTexture();
            } catch (error) {
                console.error('Error creating lava worm texture:', error);
            }
            
            // Create lava worms
            try {
                this.createLavaWorms();
            } catch (error) {
                console.error('Error creating lava worms:', error);
            }
            
            // Create dragon boss texture
            this.createDragonBossTexture();
            
            // Initialize dragon boss (will spawn when arena is entered)
            this.dragonBoss = null;
            this.dragonFireballs = this.physics.add.group();
            this.reflectedFireballs = this.physics.add.group();
            
            // Set up enemy blockers for boss arena (after enemies are created)
            if (this.bossArenaEnemyBlockers) {
                if (this.lavaCrabs) {
                    this.physics.add.collider(this.lavaCrabs, this.bossArenaEnemyBlockers);
                }
                if (this.lavaBirds) {
                    this.physics.add.collider(this.lavaBirds, this.bossArenaEnemyBlockers);
                }
                if (this.lavaWorms) {
                    this.physics.add.collider(this.lavaWorms, this.bossArenaEnemyBlockers);
                }
            }
            
            // Set up camera to follow the player (must be after player is created)
            this.setupCamera();
            
            // Set up keyboard controls
            this.setupControls();
            
            // Player movement speed
            this.playerSpeed = 200;
            this.jumpSpeed = -500;
            
            // Initialize hearts system
            this.hearts = 3.0; // Use float to support half-heart damage
            this.goldHearts = 0; // Track gold hearts
            this.lastLavaHitTime = 0;
            this.lavaHitCooldown = 500; // 0.5 second cooldown between lava hits (continuous damage)
            this.isInvincible = false;
            this.invincibilityDuration = 1000; // 1 second of invincibility after getting hurt
            this.createHeartsDisplay();
            
            // Initialize points system
            this.points = 0;
            this.createPointsDisplay();
            
            // Initialize level completion flag
            this.levelCompleted = false;
            
            // Set up collision between player and platforms/ground
            this.physics.add.collider(this.player, this.platforms);
            if (this.ground) {
                this.physics.add.collider(this.player, this.ground);
            }
            
            // Initialize background music (but don't play it yet)
            this.musicStarted = false;
            if (this.cache.audio.exists('backgroundMusic')) {
                // Reuse global music if it exists, otherwise create new
                if (globalBackgroundMusic && globalBackgroundMusic.isPlaying) {
                    this.backgroundMusic = globalBackgroundMusic;
                    this.musicStarted = true;
                    console.log('✓ Reusing existing background music');
                } else {
                    this.backgroundMusic = this.sound.add('backgroundMusic', { 
                        volume: 0.5,
                        loop: true 
                    });
                    console.log('✓ Background music created for Level 3');
                }
            } else {
                console.warn('⚠ Background music not available in cache');
                this.backgroundMusic = null;
            }
            
            // Create hit sound effect (if available)
            if (this.cache.audio.exists('hitSound')) {
                this.hitSound = this.sound.add('hitSound', { volume: 0.7 });
                console.log('✓ Hit sound created');
            } else {
                console.warn('⚠ Hit sound not available in cache');
                this.hitSound = null;
            }
            
            // Create victory sound effect (if available)
            if (this.cache.audio.exists('victorySound')) {
                this.victorySound = this.sound.add('victorySound', { 
                    volume: 0.8
                });
                console.log('✓ Victory sound created');
            } else {
                console.warn('⚠ Victory sound not available in cache');
                this.victorySound = null;
            }
        } catch (error) {
            console.error('Error in Level3Scene create():', error);
            console.error('Error stack:', error.stack);
            // If there's an error, go back to menu instead of infinite restart loop
            this.time.delayedCall(100, () => {
                this.scene.start('MenuScene');
            });
        }
    }

    setupCamera() {
        // Camera bounds: allow camera to follow player
        this.cameras.main.setBounds(0, 0, 4000, 1000);
        // Only start following if player exists
        if (this.player) {
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setDeadzone(400, 300);
        } else {
            console.error('Cannot setup camera: player does not exist!');
        }
    }

    setupControls() {
        // Detect if device supports touch (mobile/tablet)
        const hasTouch = this.sys.game.device.input.touch;
        const isSmallScreen = this.cameras.main.width <= 768;
        this.isMobile = hasTouch || isSmallScreen;
        console.log('Device detection - Touch:', hasTouch, 'Small screen:', isSmallScreen, 'Is mobile:', this.isMobile);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        // M key for music toggle
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.mKeyJustPressed = false;
        // I key for invincibility cheat
        this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.iKeyJustPressed = false;
        this.invincibilityCheat = false; // Track if cheat is active
        
        // Mobile touch control flags
        this.mobileLeft = false;
        this.mobileRight = false;
        this.mobileJump = false;
        
        // Create mobile controls if on mobile device
        if (this.isMobile) {
            console.log('Creating mobile controls...');
            this.input.addPointer(2); // Allow 3 simultaneous touches so left/right + jump work together
            this.createMobileControls();
        } else {
            console.log('Desktop detected - no mobile controls');
        }
    }
    
    createMobileControls() {
        const { width, height } = this.cameras.main;
        const buttonSize = 120;
        const buttonSpacing = 130;
        const bottomMargin = 30;
        const sideMargin = 30;
        
        // Multi-touch: track which pointer IDs are on each button so left/right + jump work together
        this.pointersOnLeft = new Set();
        this.pointersOnRight = new Set();
        this.pointersOnJump = new Set();
        
        // Left button (bottom left)
        const leftButton = this.add.rectangle(
            sideMargin + buttonSize / 2,
            height - bottomMargin - buttonSize / 2,
            buttonSize,
            buttonSize,
            0xFFFFFF,
            0.6
        );
        leftButton.setStrokeStyle(3, 0x000000);
        leftButton.setScrollFactor(0, 0);
        leftButton.setDepth(2000);
        
        // Left arrow icon
        const leftArrow = this.add.text(
            sideMargin + buttonSize / 2,
            height - bottomMargin - buttonSize / 2,
            '←',
            {
                fontSize: '32px',
                fill: '#000000',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }
        );
        leftArrow.setOrigin(0.5, 0.5);
        leftArrow.setScrollFactor(0, 0);
        leftArrow.setDepth(2001);
        
        // Right button (next to left button)
        const rightButton = this.add.rectangle(
            sideMargin + buttonSize / 2 + buttonSpacing,
            height - bottomMargin - buttonSize / 2,
            buttonSize,
            buttonSize,
            0xFFFFFF,
            0.6
        );
        rightButton.setStrokeStyle(3, 0x000000);
        rightButton.setScrollFactor(0, 0);
        rightButton.setDepth(2000);
        
        // Right arrow icon
        const rightArrow = this.add.text(
            sideMargin + buttonSize / 2 + buttonSpacing,
            height - bottomMargin - buttonSize / 2,
            '→',
            {
                fontSize: '32px',
                fill: '#000000',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }
        );
        rightArrow.setOrigin(0.5, 0.5);
        rightArrow.setScrollFactor(0, 0);
        rightArrow.setDepth(2001);
        
        // Jump button (bottom right)
        const jumpButton = this.add.rectangle(
            width - sideMargin - buttonSize / 2,
            height - bottomMargin - buttonSize / 2,
            buttonSize,
            buttonSize,
            0x00FF00,
            0.6
        );
        jumpButton.setStrokeStyle(3, 0x000000);
        jumpButton.setScrollFactor(0, 0);
        jumpButton.setDepth(2000);
        
        // Jump icon (up arrow)
        const jumpText = this.add.text(
            width - sideMargin - buttonSize / 2,
            height - bottomMargin - buttonSize / 2,
            '↑',
            {
                fontSize: '32px',
                fill: '#000000',
                fontFamily: 'Arial',
                fontWeight: 'bold'
            }
        );
        jumpText.setOrigin(0.5, 0.5);
        jumpText.setScrollFactor(0, 0);
        jumpText.setDepth(2001);
        
        // Make buttons more interactive with proper hit areas
        leftButton.setInteractive({ useHandCursor: false, pixelPerfect: false });
        rightButton.setInteractive({ useHandCursor: false, pixelPerfect: false });
        jumpButton.setInteractive({ useHandCursor: false, pixelPerfect: false });
        
        // Touch handlers for left button (multi-touch: any finger on left = move left)
        leftButton.on('pointerdown', (pointer) => {
            this.pointersOnLeft.add(pointer.id);
            this.mobileLeft = true;
            leftButton.setFillStyle(0xCCCCCC, 0.8);
        });
        leftButton.on('pointerup', (pointer) => {
            this.pointersOnLeft.delete(pointer.id);
            this.mobileLeft = this.pointersOnLeft.size > 0;
            if (!this.mobileLeft) leftButton.setFillStyle(0xFFFFFF, 0.6);
        });
        leftButton.on('pointerout', (pointer) => {
            this.pointersOnLeft.delete(pointer.id);
            this.mobileLeft = this.pointersOnLeft.size > 0;
            if (!this.mobileLeft) leftButton.setFillStyle(0xFFFFFF, 0.6);
        });
        leftButton.on('pointercancel', (pointer) => {
            this.pointersOnLeft.delete(pointer.id);
            this.mobileLeft = this.pointersOnLeft.size > 0;
            if (!this.mobileLeft) leftButton.setFillStyle(0xFFFFFF, 0.6);
        });
        
        // Touch handlers for right button (multi-touch: any finger on right = move right)
        rightButton.on('pointerdown', (pointer) => {
            this.pointersOnRight.add(pointer.id);
            this.mobileRight = true;
            rightButton.setFillStyle(0xCCCCCC, 0.8);
        });
        rightButton.on('pointerup', (pointer) => {
            this.pointersOnRight.delete(pointer.id);
            this.mobileRight = this.pointersOnRight.size > 0;
            if (!this.mobileRight) rightButton.setFillStyle(0xFFFFFF, 0.6);
        });
        rightButton.on('pointerout', (pointer) => {
            this.pointersOnRight.delete(pointer.id);
            this.mobileRight = this.pointersOnRight.size > 0;
            if (!this.mobileRight) rightButton.setFillStyle(0xFFFFFF, 0.6);
        });
        rightButton.on('pointercancel', (pointer) => {
            this.pointersOnRight.delete(pointer.id);
            this.mobileRight = this.pointersOnRight.size > 0;
            if (!this.mobileRight) rightButton.setFillStyle(0xFFFFFF, 0.6);
        });
        
        // Touch handlers for jump button (multi-touch: jump only via green button; trigger on any finger)
        jumpButton.on('pointerdown', (pointer) => {
            this.pointersOnJump.add(pointer.id);
            this.mobileJump = true;
            jumpButton.setFillStyle(0x00CC00, 0.8);
            if (this.player && this.player.body && this.player.body.touching.down && !this.levelCompleted) {
                this.player.setVelocityY(this.jumpSpeed);
            }
        });
        jumpButton.on('pointerup', (pointer) => {
            this.pointersOnJump.delete(pointer.id);
            this.mobileJump = this.pointersOnJump.size > 0;
            if (!this.mobileJump) jumpButton.setFillStyle(0x00FF00, 0.6);
        });
        jumpButton.on('pointerout', (pointer) => {
            this.pointersOnJump.delete(pointer.id);
            this.mobileJump = this.pointersOnJump.size > 0;
            if (!this.mobileJump) jumpButton.setFillStyle(0x00FF00, 0.6);
        });
        jumpButton.on('pointercancel', (pointer) => {
            this.pointersOnJump.delete(pointer.id);
            this.mobileJump = this.pointersOnJump.size > 0;
            if (!this.mobileJump) jumpButton.setFillStyle(0x00FF00, 0.6);
        });
        
        // Store references for cleanup if needed
        this.mobileControls = {
            leftButton,
            rightButton,
            jumpButton,
            leftArrow,
            rightArrow,
            jumpText
        };
    }

    createStickman() {
        try {
            this.createStickmanPose('stickman_idle', 'idle');
            this.createStickmanPose('stickman_walking1', 'walking1');
            this.createStickmanPose('stickman_walking2', 'walking2');
            this.createStickmanPose('stickman_jumping', 'jumping');
            this.createStickmanPose('stickman_falling', 'falling');
            
            this.player = this.physics.add.sprite(100, 440, 'stickman_idle'); // Moved down 10px to match ground
            this.player.setOrigin(0.5, 0.5);
            this.player.setCollideWorldBounds(true);
            this.player.setDragX(500);
            this.player.setDepth(5); // Set player depth above background elements
            
            // Make hitbox tighter (smaller collision box)
            if (this.player.body) {
                this.player.body.setSize(30, 55);
                this.player.body.setOffset(10, 2.5);
            }
            
            this.currentPose = 'idle';
            this.walkFrame = 0;
            this.walkFrameCounter = 0;
            this.walkFrameDelay = 8;
            this.facingDirection = 1;
            
            console.log('Stickman created successfully!');
        } catch (error) {
            console.error('Error creating stickman:', error);
        }
    }

    createStickmanPose(textureName, pose) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000);
        
        const centerX = 25;
        const centerY = 10;
        
        const headX = centerX;
        const headY = centerY + 8;
        const headRadius = 8;
        graphics.fillCircle(headX, headY, headRadius);
        
        graphics.fillStyle(0xFFFFFF);
        const eyeRadius = 3;
        const eyeX = headX + headRadius - 2;
        const eyeY = headY;
        graphics.fillCircle(eyeX, eyeY, eyeRadius);
        
        graphics.fillStyle(0x000000);
        const pupilRadius = 2;
        graphics.fillCircle(eyeX, eyeY, pupilRadius);
        
        graphics.fillStyle(0x000000);
        
        const bodyX = headX;
        const bodyY = headY + headRadius;
        const bodyWidth = 6;
        const bodyHeight = 20;
        graphics.fillRect(bodyX - bodyWidth/2, bodyY, bodyWidth, bodyHeight);
        
        if (pose === 'jumping') {
            const armY = bodyY + 5;
            const armLength = 12;
            const armWidth = 4;
            graphics.fillRect(bodyX - bodyWidth/2 - 8, armY - 8, armLength, armWidth);
            graphics.fillRect(bodyX + bodyWidth/2 - 4, armY - 8, armLength, armWidth);
        } else if (pose === 'falling') {
            const armY = bodyY + 5;
            const armLength = 12;
            const armWidth = 4;
            graphics.fillRect(bodyX - bodyWidth/2 - 8, armY + 8, armLength, armWidth);
            graphics.fillRect(bodyX + bodyWidth/2 - 4, armY + 8, armLength, armWidth);
        }
        
        const legStartY = bodyY + bodyHeight;
        const legLength = 18;
        const legWidth = 5;
        
        if (pose === 'walking1') {
            const legSpacing = 6;
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY - 3, legWidth, legLength);
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY + 2, legWidth, legLength);
        } else if (pose === 'walking2') {
            const legSpacing = 6;
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY + 2, legWidth, legLength);
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY - 3, legWidth, legLength);
        } else {
            const legSpacing = 4;
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY, legWidth, legLength);
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY, legWidth, legLength);
        }
        
        graphics.generateTexture(textureName, 50, 60);
        graphics.destroy();
    }

    createLavaBackground() {
        // Create dark volcanic atmosphere with glowing embers
        this.lavaEmbers = this.add.group();
        
        // Add some glowing ember particles in the background
        for (let i = 0; i < 30; i++) {
            const emberX = Phaser.Math.Between(0, 4000);
            const emberY = Phaser.Math.Between(0, 600);
            const ember = this.add.circle(emberX, emberY, Phaser.Math.Between(2, 5), 0xFF4500, 0.3);
            ember.setScrollFactor(0.3, 0.3); // Slow parallax
            ember.setDepth(-10);
            this.lavaEmbers.add(ember);
        }
        
        // Add heat distortion effect (visual only)
        this.heatDistortion = this.add.graphics();
        this.heatDistortion.setDepth(-5);
    }

    createGroundAndPlatforms() {
        // Create platforms group
        this.platforms = this.physics.add.staticGroup();
        
        const worldWidth = 4000;
        const gameHeight = 600; // Game is 600px tall
        const groundTopY = 540; // Top of ground (where player walks)
        // Make ground extend all the way to the very bottom of the screen and well beyond
        // Extend to world bounds bottom (1000) to ensure it covers everything
        const worldBoundsBottom = 1000; // World bounds height
        const groundHeight = worldBoundsBottom - groundTopY; // 1000 - 540 = 460px total height
        const platformColor = 0x4A4A4A; // Dark gray/black rock color
        const platformHeight = 20;
        
        // Create continuous ground that extends to bottom of screen
        // Position rectangle so it covers from groundTopY all the way to bottom
        // Center Y = groundTopY + groundHeight/2 = 545 + 32.5 = 577.5
        // This means ground extends from 545 to 610, covering the entire bottom
        // Use dark volcanic rock color
        const groundCenterY = groundTopY + groundHeight / 2;
        const ground = this.add.rectangle(worldWidth / 2, groundCenterY, worldWidth, groundHeight, 0x3A3A3A);
        this.physics.add.existing(ground, true);
        ground.setOrigin(0.5, 0.5);
        ground.setDepth(-1); // Behind everything
        this.ground = ground;
        
        // Add detailed texture to the ground (cracked volcanic rock)
        this.addGroundDetail(worldWidth / 2, groundTopY, worldWidth, groundHeight);
        
        // Create platforms similar to Level 2 but with rock theme
        // All platforms moved down 10px to match ground adjustment
        // Layout ensures all platforms are reachable from each other
        const extraPlatforms = [
            { x: 500, y: 440, width: 160 },      // Starting platform - wider for easier landing
            { x: 850, y: 435, width: 140 },      // Close enough to reach (350px gap, 5px lower)
            { x: 1150, y: 440, width: 150 },    // Reachable (300px gap, 5px higher)
            { x: 1450, y: 425, width: 130 },     // Reachable (300px gap, 15px lower)
            { x: 1750, y: 410, width: 140 },     // Intermediate platform (300px gap, 15px higher)
            { x: 2050, y: 400, width: 150 },     // Reachable (300px gap, 10px lower)
            { x: 2350, y: 410, width: 160 },     // Reachable (300px gap, 10px higher)
            { x: 2650, y: 400, width: 140 },     // Reachable (300px gap, 10px lower)
            { x: 2950, y: 395, width: 150 },      // Reachable (300px gap, 5px lower)
            { x: 3250, y: 390, width: 160 }      // Reachable (300px gap, 5px lower)
        ];
        
        extraPlatforms.forEach((platformData) => {
            const platform = this.add.rectangle(platformData.x, platformData.y, platformData.width, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            this.addPlatformDetail(platformData.x, platformData.y, platformData.width, platformHeight);
        });
        
        // Create boss area before finish (placeholder)
        // Boss platform removed - player was standing on it
        const bossAreaX = 3500;
        
        // Create boss arena dome on the floor
        const bossDomeFloorY = 540; // Ground level
        this.createBossArenaDome(bossAreaX, bossDomeFloorY);
        
        // Add platforms inside arena: two reachable from floor, one higher in between
        // Plus platforms where player is floating
        // Arena spans from x=2900 to x=4100 (bossAreaX ± 600 radius)
        // Floor is at y=540, jumpable reach is about 100-120px
        const arenaPlatforms = [
            // Left platform - reachable from floor
            { x: 3300, y: 480, width: 150 }, // 60px above floor
            
            // Center platform - higher, requires jump from other platforms (moved up)
            { x: 3500, y: 320, width: 160 }, // 220px above floor (moved up from 360)
            
            // Platform at first floating position (lower-right area)
            { x: 3900, y: 480, width: 150 }, // Lower-right, near floor level
            
            // Platform above the right platform
            { x: 3900, y: 360, width: 150 }, // Above right platform
            
            // Platform at second floating position (slightly right of center, above vertical center)
            { x: 3650, y: 320, width: 150 }, // Right of center, mid-height
        ];
        
        arenaPlatforms.forEach((platformData) => {
            const platform = this.add.rectangle(platformData.x, platformData.y, platformData.width, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            this.addPlatformDetail(platformData.x, platformData.y, platformData.width, platformHeight);
        });
        
        console.log('Ground and platforms created!');
    }

    addGroundDetail(centerX, topY, width, height) {
        // Add textured volcanic rock to ground (optimized for performance)
        const detailGraphics = this.add.graphics();
        
        // Simplified texture - fewer operations for better performance
        const tileSize = 100; // Larger tiles = fewer operations
        const tilesX = Math.ceil(width / tileSize);
        const tilesY = Math.ceil(height / tileSize);
        
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                const tileX = centerX - width/2 + (tx * tileSize);
                const tileY = topY + (ty * tileSize);
                
                // Reduced patches per tile
                detailGraphics.fillStyle(0x2A2A2A, 0.7);
                for (let i = 0; i < 2; i++) {
                    const patchX = tileX + Math.random() * tileSize;
                    const patchY = tileY + Math.random() * tileSize;
                    const patchSize = 10 + Math.random() * 15;
                    detailGraphics.fillCircle(patchX, patchY, patchSize);
                }
                
                detailGraphics.fillStyle(0x3A3A3A, 0.6);
                for (let i = 0; i < 2; i++) {
                    const patchX = tileX + Math.random() * tileSize;
                    const patchY = tileY + Math.random() * tileSize;
                    const patchSize = 8 + Math.random() * 12;
                    detailGraphics.fillCircle(patchX, patchY, patchSize);
                }
            }
        }
        
        // Reduced number of cracks
        detailGraphics.lineStyle(2, 0x1A1A1A, 0.7);
        for (let i = 0; i < 20; i++) {
            const crackX = centerX - width/2 + Math.random() * width;
            const crackY = topY + Math.random() * height;
            const crackLength = 40 + Math.random() * 60;
            const crackAngle = Math.random() * Math.PI * 2;
            
            const endX = crackX + Math.cos(crackAngle) * crackLength;
            const endY = crackY + Math.sin(crackAngle) * crackLength;
            
            detailGraphics.beginPath();
            detailGraphics.moveTo(crackX, crackY);
            detailGraphics.lineTo(endX, endY);
            detailGraphics.strokePath();
        }
        
        // Reduced particles
        detailGraphics.fillStyle(0x2A2A2A, 0.5);
        for (let i = 0; i < 50; i++) {
            const particleX = centerX - width/2 + Math.random() * width;
            const particleY = topY + Math.random() * height;
            const particleSize = 2 + Math.random() * 3;
            detailGraphics.fillRect(particleX, particleY, particleSize, particleSize);
        }
        
        detailGraphics.setDepth(-1);
    }

    addPlatformDetail(x, y, width, height) {
        // Add textured volcanic rock to platforms (optimized for performance)
        const detailGraphics = this.add.graphics();
        
        // Simplified texture - fewer operations
        detailGraphics.fillStyle(0x2A2A2A, 0.6);
        for (let i = 0; i < 3; i++) {
            const patchX = x - width/2 + Math.random() * width;
            const patchY = y - height/2 + Math.random() * height;
            const patchSize = 6 + Math.random() * 10;
            detailGraphics.fillCircle(patchX, patchY, patchSize);
        }
        
        detailGraphics.fillStyle(0x3A3A3A, 0.5);
        for (let i = 0; i < 3; i++) {
            const patchX = x - width/2 + Math.random() * width;
            const patchY = y - height/2 + Math.random() * height;
            const patchSize = 5 + Math.random() * 8;
            detailGraphics.fillCircle(patchX, patchY, patchSize);
        }
        
        // Fewer cracks
        detailGraphics.lineStyle(1.5, 0x1A1A1A, 0.7);
        for (let i = 0; i < 5; i++) {
            const crackX = x - width/2 + Math.random() * width;
            const crackY = y - height/2 + Math.random() * height;
            const crackLength = 15 + Math.random() * 25;
            const crackAngle = Math.random() * Math.PI * 2;
            
            const endX = crackX + Math.cos(crackAngle) * crackLength;
            const endY = crackY + Math.sin(crackAngle) * crackLength;
            
            detailGraphics.beginPath();
            detailGraphics.moveTo(crackX, crackY);
            detailGraphics.lineTo(endX, endY);
            detailGraphics.strokePath();
        }
        
        // Reduced particles
        detailGraphics.fillStyle(0x2A2A2A, 0.5);
        for (let i = 0; i < 10; i++) {
            const particleX = x - width/2 + Math.random() * width;
            const particleY = y - height/2 + Math.random() * height;
            const particleSize = 1.5 + Math.random() * 2.5;
            detailGraphics.fillRect(particleX, particleY, particleSize, particleSize);
        }
        
        detailGraphics.setDepth(1);
    }

    createBossArenaDome(centerX, floorY) {
        // Create a much larger full circular hemispherical dome on the floor
        const domeRadius = 600; // Increased radius for longer/taller dome
        const domeThickness = 25; // Thickness of the dome structure
        const floorCenterY = floorY; // Floor is at y = 540
        const doorWidth = 120; // Width of the door openings (wider for easier entry)
        const wallThickness = 30; // Thickness of solid walls
        
        // Initialize boss arena state
        this.bossArenaEntered = false;
        this.bossDead = false;
        this.bossArenaCenterX = centerX;
        this.bossArenaRadius = domeRadius;
        this.bossArenaFloorY = floorCenterY;
        
        // Create group for arena walls
        this.bossArenaWalls = this.physics.add.staticGroup();
        
        // Door positions - positioned at a good distance from center for large dome
        const leftDoorX = centerX - 200; // 200 pixels left of center
        const rightDoorX = centerX + 200; // 200 pixels right of center
        const doorY = floorCenterY - 60; // Door Y position
        const doorHeight = 120; // Height of door opening
        
        // NOTE: Walls removed temporarily - will be added back later
        // The walls that block player entry have been removed for now
        
        // Create invisible enemy blocker walls (prevent enemies from entering through sides)
        // Only block enemies, not player - create separate group
        this.bossArenaEnemyBlockers = this.physics.add.staticGroup();
        
        // Left blocker - only blocks enemies, not player
        const leftBlocker = this.add.rectangle(
            centerX - domeRadius - 10,
            floorCenterY - domeRadius / 2,
            20,
            domeRadius,
            0x000000,
            0 // Invisible
        );
        this.physics.add.existing(leftBlocker, true);
        leftBlocker.setVisible(false);
        // Don't add to bossArenaWalls - only add to enemy blockers
        this.bossArenaEnemyBlockers.add(leftBlocker);
        
        // Right blocker - only blocks enemies, not player
        const rightBlocker = this.add.rectangle(
            centerX + domeRadius + 10,
            floorCenterY - domeRadius / 2,
            20,
            domeRadius,
            0x000000,
            0 // Invisible
        );
        this.physics.add.existing(rightBlocker, true);
        rightBlocker.setVisible(false);
        // Don't add to bossArenaWalls - only add to enemy blockers
        this.bossArenaEnemyBlockers.add(rightBlocker);
        
        // Create arena perimeter walls - these ARE the arena boundaries
        // These start open (allow entry) but close when player enters arena
        // Full-height walls at the left and right edges of the dome
        const barrierHeight = domeRadius; // Height from floor to top of dome
        const barrierCenterY = floorCenterY - domeRadius / 2; // Center vertically
        const barrierThickness = 30; // Thickness of the wall
        
        // Left arena wall - at the left edge of the dome (centerX - domeRadius)
        this.bossArenaLeftDoor = this.add.rectangle(
            centerX - domeRadius,
            barrierCenterY,
            barrierThickness,
            barrierHeight,
            0xFF4500,
            0 // Invisible
        );
        this.physics.add.existing(this.bossArenaLeftDoor, true);
        this.bossArenaLeftDoor.setVisible(false);
        this.bossArenaLeftDoor.isOpen = true; // Start open to allow entry
        this.bossArenaLeftDoor.body.enable = false; // Non-solid initially
        this.bossArenaLeftDoor.setDepth(10000);
        
        // Right arena wall - at the right edge of the dome (centerX + domeRadius)
        this.bossArenaRightDoor = this.add.rectangle(
            centerX + domeRadius,
            barrierCenterY,
            barrierThickness,
            barrierHeight,
            0xFF4500,
            0 // Invisible
        );
        this.physics.add.existing(this.bossArenaRightDoor, true);
        this.bossArenaRightDoor.setVisible(false);
        this.bossArenaRightDoor.isOpen = true; // Start open to allow entry
        this.bossArenaRightDoor.body.enable = false; // Non-solid initially
        this.bossArenaRightDoor.setDepth(10000);
        
        // Arena center marker removed
        
        console.log('Boss arena dome created! Center:', centerX, 'Floor Y:', floorCenterY, 'Dome radius:', domeRadius);
        
        // Create the complete hemispherical dome arch (no gaps - full semicircle)
        const domeGraphics = this.add.graphics();
        domeGraphics.lineStyle(domeThickness, 0xFF4500, 1); // Lava glow color
        
        const numPoints = 60; // More points for smoother arc
        
        // Draw complete semicircle from 180° (left) to 0° (right)
        for (let i = 0; i <= numPoints; i++) {
            const angle = Math.PI - (i / numPoints) * Math.PI; // From 180° to 0°
            const x = centerX + Math.cos(angle) * domeRadius;
            const y = floorCenterY - Math.sin(angle) * domeRadius;
            
            if (i === 0) {
                domeGraphics.moveTo(x, y);
            } else {
                domeGraphics.lineTo(x, y);
            }
        }
        
        domeGraphics.strokePath();
        domeGraphics.setDepth(5);
        
        // Add complete dome fill (semi-transparent lava glow)
        const domeFill = this.add.graphics();
        domeFill.fillStyle(0xFF4500, 0.15);
        
        // Fill the complete semicircle
        domeFill.moveTo(centerX - domeRadius, floorCenterY);
        for (let i = 0; i <= numPoints; i++) {
            const angle = Math.PI - (i / numPoints) * Math.PI;
            const x = centerX + Math.cos(angle) * domeRadius;
            const y = floorCenterY - Math.sin(angle) * domeRadius;
            domeFill.lineTo(x, y);
        }
        domeFill.lineTo(centerX + domeRadius, floorCenterY);
        domeFill.closePath();
        domeFill.fillPath();
        domeFill.setDepth(4);
        
        // Add complete inner glow effect
        const innerGlow = this.add.graphics();
        innerGlow.lineStyle(8, 0xFF6600, 0.6);
        const innerRadius = domeRadius - 15;
        
        // Draw complete inner glow semicircle
        for (let i = 0; i <= numPoints; i++) {
            const angle = Math.PI - (i / numPoints) * Math.PI;
            const x = centerX + Math.cos(angle) * innerRadius;
            const y = floorCenterY - Math.sin(angle) * innerRadius;
            
            if (i === 0) {
                innerGlow.moveTo(x, y);
            } else {
                innerGlow.lineTo(x, y);
            }
        }
        innerGlow.strokePath();
        innerGlow.setDepth(6);
        
        // Add glowing embers inside the dome
        for (let i = 0; i < 20; i++) {
            const angle = Phaser.Math.Between(0, 180) * Math.PI / 180; // Random angle in top half
            const distance = Phaser.Math.Between(80, domeRadius - 50);
            const emberX = centerX + Math.cos(angle) * distance;
            const emberY = floorCenterY - Math.sin(angle) * distance;
            const emberSize = Phaser.Math.Between(4, 8);
            const ember = this.add.circle(emberX, emberY, emberSize, 0xFF4500, 0.5);
            ember.setDepth(3);
            
            // Animate embers pulsing
            this.tweens.add({
                targets: ember,
                alpha: { from: 0.3, to: 0.8 },
                scale: { from: 1, to: 1.4 },
                duration: Phaser.Math.Between(1000, 2500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Add collision between player and arena walls (doors added/removed dynamically)
        this.physics.add.collider(this.player, this.bossArenaWalls);
        
        // Store reference for door collision management
        this.playerArenaWallCollider = this.physics.add.collider(this.player, this.bossArenaWalls);
        
        // Add collision between enemies and arena blocker walls (prevent entry)
        // This will be set up after enemies are created
        
        console.log('Boss arena hemispherical dome created at:', centerX, floorY, 'Radius:', domeRadius);
        
        // Finish flag will be created when the fish dies, at player's position
    }

    createLavaPondTexture() {
        if (!this.textures.exists('lavaPond')) {
            const graphics = this.add.graphics();
            
            // Create animated lava texture with bubbling effect
            const width = 200;
            const height = 100;
            
            // Base lava color (bright orange-red)
            graphics.fillStyle(0xFF4500);
            graphics.fillRect(0, 0, width, height);
            
            // Add brighter orange highlights
            graphics.fillStyle(0xFF6600);
            for (let i = 0; i < 10; i++) {
                const bubbleX = Math.random() * width;
                const bubbleY = Math.random() * height;
                const bubbleSize = 10 + Math.random() * 20;
                graphics.fillCircle(bubbleX, bubbleY, bubbleSize);
            }
            
            // Add yellow hot spots
            graphics.fillStyle(0xFFAA00);
            for (let i = 0; i < 5; i++) {
                const hotX = Math.random() * width;
                const hotY = Math.random() * height;
                const hotSize = 5 + Math.random() * 10;
                graphics.fillCircle(hotX, hotY, hotSize);
            }
            
            // Add dark red edges for depth
            graphics.fillStyle(0xCC3300);
            graphics.fillRect(0, 0, width, 5); // Top edge
            graphics.fillRect(0, height - 5, width, 5); // Bottom edge
            
            graphics.generateTexture('lavaPond', width, height);
            graphics.destroy();
            
            console.log('Lava pond texture created');
        }
    }

    createLavaPonds() {
        // Create group for lava ponds
        this.lavaPonds = this.physics.add.staticGroup();
        
        // Define lava pond positions (strategically placed to create challenge)
        // All moved down 10px to match ground adjustment
        const arenaCenterX = 3500; // Boss arena center
        const arenaRadius = 500; // Boss arena radius
        const arenaLeft = arenaCenterX - arenaRadius; // x: 3000
        const arenaRight = arenaCenterX + arenaRadius; // x: 4000
        
        const lavaPondPositions = [
            { x: 700, y: 550, width: 150, height: 40 },   // Early challenge
            { x: 1100, y: 550, width: 120, height: 40 },  // Between platforms
            { x: 1700, y: 550, width: 180, height: 40 },  // Wider pond
            { x: 2600, y: 550, width: 140, height: 40 },  // Mid-level
            { x: 3100, y: 550, width: 160, height: 40 }  // Before boss area (check if in arena)
        ];
        
        lavaPondPositions.forEach((pondData) => {
            // Skip lava ponds that are inside the boss arena
            const pondLeft = pondData.x - pondData.width / 2;
            const pondRight = pondData.x + pondData.width / 2;
            if ((pondLeft >= arenaLeft && pondLeft <= arenaRight) || 
                (pondRight >= arenaLeft && pondRight <= arenaRight) ||
                (pondLeft <= arenaLeft && pondRight >= arenaRight)) {
                console.log('Skipping lava pond at x:', pondData.x, '- inside boss arena');
                return; // Skip this pond
            }
            // Create visual lava pond
            const lavaPond = this.add.image(pondData.x, pondData.y, 'lavaPond');
            lavaPond.setOrigin(0.5, 0.5);
            lavaPond.setScale(pondData.width / 200, pondData.height / 100);
            lavaPond.setDepth(2);
            
            // Add physics body for collision detection
            this.physics.add.existing(lavaPond, true);
            if (lavaPond.body) {
                lavaPond.body.setSize(pondData.width, pondData.height);
            }
            
            // Add to group
            this.lavaPonds.add(lavaPond);
            
            // Add glowing effect
            this.addLavaGlow(pondData.x, pondData.y, pondData.width, pondData.height);
            
            // Set up overlap detector for damage
            this.physics.add.overlap(this.player, lavaPond, () => {
                this.hitLava(lavaPond);
            }, null, this);
        });
        
        console.log('Lava ponds created:', lavaPondPositions.length);
    }

    createLavaCrabTexture() {
        // Create two textures - one with claws open, one with claws closed for animation
        if (!this.textures.exists('lavaCrab')) {
            const graphics = this.add.graphics();
            
            // Create lava crab texture - bigger than player (player is ~30x55, crab will be ~40x65)
            const width = 40;
            const height = 65;
            
            // Crab body (oval/rounded rectangle)
            graphics.fillStyle(0xFF4500); // Orange-red lava color
            graphics.fillRoundedRect(10, 20, 20, 25, 5);
            
            // Crab shell/carapace (darker on top)
            graphics.fillStyle(0xCC3300);
            graphics.fillRoundedRect(12, 22, 16, 12, 3);
            
            // Eyes (glowing)
            graphics.fillStyle(0xFFAA00); // Bright yellow
            graphics.fillCircle(18, 28, 3);
            graphics.fillCircle(22, 28, 3);
            
            // Claws OPEN (left and right)
            graphics.fillStyle(0xFF4500);
            // Left claw open
            graphics.fillCircle(5, 30, 6);
            graphics.fillRect(2, 30, 6, 8);
            // Right claw open
            graphics.fillCircle(35, 30, 6);
            graphics.fillRect(32, 30, 6, 8);
            
            // Legs (4 on each side)
            graphics.fillStyle(0xFF6600);
            for (let i = 0; i < 4; i++) {
                const legY = 35 + (i * 6);
                // Left legs
                graphics.fillRect(8, legY, 4, 12);
                // Right legs
                graphics.fillRect(28, legY, 4, 12);
            }
            
            graphics.generateTexture('lavaCrab', width, height);
            graphics.clear();
            
            // Create second texture with claws CLOSED
            // Crab body (same)
            graphics.fillStyle(0xFF4500);
            graphics.fillRoundedRect(10, 20, 20, 25, 5);
            
            // Crab shell/carapace (same)
            graphics.fillStyle(0xCC3300);
            graphics.fillRoundedRect(12, 22, 16, 12, 3);
            
            // Eyes (same)
            graphics.fillStyle(0xFFAA00);
            graphics.fillCircle(18, 28, 3);
            graphics.fillCircle(22, 28, 3);
            
            // Claws CLOSED (clipped together)
            graphics.fillStyle(0xFF4500);
            // Left claw closed (moved in)
            graphics.fillCircle(8, 30, 6);
            graphics.fillRect(5, 30, 6, 8);
            // Right claw closed (moved in)
            graphics.fillCircle(32, 30, 6);
            graphics.fillRect(29, 30, 6, 8);
            
            // Legs (same)
            graphics.fillStyle(0xFF6600);
            for (let i = 0; i < 4; i++) {
                const legY = 35 + (i * 6);
                graphics.fillRect(8, legY, 4, 12);
                graphics.fillRect(28, legY, 4, 12);
            }
            
            graphics.generateTexture('lavaCrabClosed', width, height);
            graphics.destroy();
            
            console.log('Lava crab textures created');
        }
    }

    createLavaCrabs() {
        // Create group for lava crabs
        this.lavaCrabs = this.physics.add.group();
        
        // Place crabs on the ground throughout the level (not on platforms)
        const groundY = 540; // Ground top Y position
        const crabPositions = [
            { x: 600, y: groundY - 30 },   // On ground
            { x: 1200, y: groundY - 30 },  // On ground
            { x: 1800, y: groundY - 30 },  // On ground
            { x: 2400, y: groundY - 30 },  // On ground
            // Removed crab at x: 3000 (closest to boss arena door)
        ];
        
        crabPositions.forEach((pos) => {
            const crab = this.physics.add.sprite(pos.x, pos.y, 'lavaCrab');
            crab.setOrigin(0.5, 0.5);
            crab.setCollideWorldBounds(false);
            crab.setDepth(3);
            
            // Set collision body size
            if (crab.body) {
                crab.body.setSize(35, 60);
                crab.body.setOffset(2.5, 2.5);
                // Disable gravity so crab doesn't fall
                crab.body.setGravityY(0);
                // Don't make it immovable - let it move freely on ground
                crab.body.setImmovable(false);
            }
            
            // Store platform info for movement
            crab.platformX = pos.x;
            crab.platformY = pos.y;
            crab.direction = Math.random() > 0.5 ? 1 : -1; // Start moving left or right
            crab.speed = 120; // Faster movement speed
            crab.maxMoveDistance = 150; // Move 150px in each direction (wider range)
            
            // Only collide with ground, not platforms (so they can move freely on ground)
            if (this.ground) {
                this.physics.add.collider(crab, this.ground);
            }
            
            // Add overlap detector for player damage
            this.physics.add.overlap(this.player, crab, () => {
                this.hitLavaCrab(crab);
            }, null, this);
            
            this.lavaCrabs.add(crab);
        });
        
        console.log('Lava crabs created:', crabPositions.length);
    }

    createLavaBirdTexture() {
        if (!this.textures.exists('lavaBird')) {
            const graphics = this.add.graphics();
            
            // Create lava bird texture - slightly smaller than player
            const width = 35;
            const height = 50;
            
            // Bird body (oval)
            graphics.fillStyle(0xFF4500); // Orange-red lava color
            graphics.fillEllipse(17.5, 25, 12, 18);
            
            // Bird head
            graphics.fillStyle(0xFF6600);
            graphics.fillCircle(17.5, 12, 8);
            
            // Glowing eyes
            graphics.fillStyle(0xFFAA00); // Bright yellow
            graphics.fillCircle(15, 11, 2);
            graphics.fillCircle(20, 11, 2);
            
            // Wings (extended for flying)
            graphics.fillStyle(0xFF4500);
            // Left wing
            graphics.fillEllipse(8, 20, 10, 6);
            // Right wing
            graphics.fillEllipse(25, 20, 10, 6);
            
            // Tail
            graphics.fillStyle(0xCC3300);
            graphics.fillTriangle(17.5, 35, 10, 45, 25, 45);
            
            // Beak
            graphics.fillStyle(0xFFAA00);
            graphics.fillTriangle(17.5, 8, 14, 4, 21, 4);
            
            graphics.generateTexture('lavaBird', width, height);
            graphics.destroy();
            
            console.log('Lava bird texture created');
        }
    }

    createLavaBirds() {
        // Create group for lava birds
        this.lavaBirds = this.physics.add.group();
        
        // Create group for fireballs
        this.fireballs = this.physics.add.group();
        
        // Place 4 birds at various positions, flying at different heights
        const birdPositions = [
            { x: 800, y: 200 },   // Early area, high up
            { x: 1600, y: 250 },  // Mid-level, medium height
            { x: 2400, y: 180 },  // Later area, high up
            { x: 3200, y: 220 },  // Near boss area, medium height
        ];
        
        birdPositions.forEach((pos) => {
            const bird = this.physics.add.sprite(pos.x, pos.y, 'lavaBird');
            bird.setOrigin(0.5, 0.5);
            bird.setDepth(4);
            
            // Set collision body size
            if (bird.body) {
                bird.body.setSize(30, 45);
                bird.body.setOffset(2.5, 2.5);
                // Disable gravity so bird can fly
                bird.body.setGravityY(0);
                // Make sure bird doesn't collide with anything (will use overlap only)
                bird.body.setImmovable(true);
                // Set velocity to 0 to prevent any initial falling
                bird.body.setVelocity(0, 0);
            }
            
            // Store movement and behavior info
            bird.speed = 80; // Flying speed
            bird.followRange = 600; // How far away player can be to follow
            bird.isDead = false;
            bird.lastFireballTime = 0;
            bird.fireballCooldown = 3500; // Drop fireball every 3.5 seconds
            
            // Don't collide with platforms or ground - birds fly freely
            // Only use overlap for stomp detection, not collider
            
            // Add overlap detector for player damage and stomp
            this.physics.add.overlap(this.player, bird, (player, bird) => {
                this.handleBirdCollision(player, bird);
            }, null, this);
            
            this.lavaBirds.add(bird);
        });
        
        // Set up fireball collisions - destroy fireball on contact, not the platform/ground
        // In Phaser collider callbacks: (dynamicBody, staticBody)
        this.physics.add.collider(this.fireballs, this.platforms, (fireball, platform) => {
            // fireball is the dynamic body (first param), platform is static (second param)
            // Only destroy the fireball, NEVER the platform
            if (fireball && fireball.active && fireball.body && fireball !== platform) {
                fireball.destroy();
            }
        });
        
        if (this.ground) {
            // Fireball collides with ground - fireball is dynamic, ground is static
            // In Phaser collider callbacks: (dynamicBody, staticBody)
            this.physics.add.collider(this.fireballs, this.ground, (fireball, groundObj) => {
                // fireball is the dynamic body (first param), groundObj is static (second param)
                // Only destroy the fireball, NEVER the ground
                if (fireball && fireball.active && fireball.body && fireball !== this.ground && fireball !== groundObj) {
                    fireball.destroy();
                }
            });
        }
        
        // Fireball damage to player
        this.physics.add.overlap(this.player, this.fireballs, (player, fireball) => {
            this.hitFireball(fireball);
        }, null, this);
        
        console.log('Lava birds created:', birdPositions.length);
    }
    
    createLavaWormTexture() {
        console.log('createLavaWormTexture called');
        if (!this.textures.exists('lavaWormHeadRight')) {
            console.log('Creating lava worm textures...');
            const graphics = this.add.graphics();
            
            // Create worm head texture - slightly larger than player
            const headWidth = 40;
            const headHeight = 50;
            
            // Create RIGHT-facing head (default)
            // Head body (oval/rounded)
            graphics.fillStyle(0xFF4500); // Orange-red lava color
            graphics.fillEllipse(headWidth/2, headHeight/2, headWidth * 0.8, headHeight * 0.8);
            
            // Darker top section
            graphics.fillStyle(0xCC3300);
            graphics.fillEllipse(headWidth/2, headHeight/2 - 5, headWidth * 0.7, headHeight * 0.4);
            
            // Glowing eyes (right-facing: left eye at x-8, right eye at x+8)
            graphics.fillStyle(0xFFAA00); // Bright yellow
            graphics.fillCircle(headWidth/2 - 8, headHeight/2 - 5, 4); // Left eye
            graphics.fillCircle(headWidth/2 + 8, headHeight/2 - 5, 4); // Right eye
            
            // Inner eye glow
            graphics.fillStyle(0xFFFF00);
            graphics.fillCircle(headWidth/2 - 8, headHeight/2 - 5, 2);
            graphics.fillCircle(headWidth/2 + 8, headHeight/2 - 5, 2);
            
            // Mouth (dark line) - positioned for right-facing
            graphics.fillStyle(0x990000);
            graphics.fillRect(headWidth/2 - 6, headHeight/2 + 8, 12, 3);
            
            graphics.generateTexture('lavaWormHeadRight', headWidth, headHeight);
            graphics.clear();
            
            // Create LEFT-facing head (eyes swapped to left side)
            // Head body (same)
            graphics.fillStyle(0xFF4500);
            graphics.fillEllipse(headWidth/2, headHeight/2, headWidth * 0.8, headHeight * 0.8);
            
            // Darker top section (same)
            graphics.fillStyle(0xCC3300);
            graphics.fillEllipse(headWidth/2, headHeight/2 - 5, headWidth * 0.7, headHeight * 0.4);
            
            // Glowing eyes (SWAPPED for left-facing: left eye closer to center, right eye further right)
            // For left-facing, the "front" eye should be on the left
            graphics.fillStyle(0xFFAA00);
            graphics.fillCircle(headWidth/2 - 12, headHeight/2 - 5, 4); // Left eye (more to the left)
            graphics.fillCircle(headWidth/2 + 4, headHeight/2 - 5, 4);  // Right eye (closer to center)
            
            // Inner eye glow
            graphics.fillStyle(0xFFFF00);
            graphics.fillCircle(headWidth/2 - 12, headHeight/2 - 5, 2);
            graphics.fillCircle(headWidth/2 + 4, headHeight/2 - 5, 2);
            
            // Mouth (shifted left) 
            graphics.fillStyle(0x990000);
            graphics.fillRect(headWidth/2 - 10, headHeight/2 + 8, 12, 3);
            
            graphics.generateTexture('lavaWormHeadLeft', headWidth, headHeight);
            graphics.clear();
            
            // Create worm body segment texture
            const segmentWidth = 35;
            const segmentHeight = 45;
            
            // Body segment (smaller than head)
            graphics.fillStyle(0xFF4500);
            graphics.fillEllipse(segmentWidth/2, segmentHeight/2, segmentWidth * 0.8, segmentHeight * 0.8);
            
            // Darker top
            graphics.fillStyle(0xCC3300);
            graphics.fillEllipse(segmentWidth/2, segmentHeight/2 - 3, segmentWidth * 0.7, segmentHeight * 0.3);
            
            // Glowing spots (lava glow)
            graphics.fillStyle(0xFF6600, 0.8);
            graphics.fillCircle(segmentWidth/2, segmentHeight/2, 4);
            
            graphics.generateTexture('lavaWormSegment', segmentWidth, segmentHeight);
            graphics.destroy();
            
            console.log('Lava worm textures created');
        }
    }
    
    createLavaWorms() {
        console.log('createLavaWorms called');
        // Create group for lava worms
        this.lavaWorms = this.physics.add.group();
        
        // Check if textures exist
        if (!this.textures.exists('lavaWormHeadRight') || !this.textures.exists('lavaWormHeadLeft') || !this.textures.exists('lavaWormSegment')) {
            console.error('Lava worm textures not found! Creating them now...');
            this.createLavaWormTexture();
        }
        
        if (!this.textures.exists('lavaWormHeadRight') || !this.textures.exists('lavaWormHeadLeft') || !this.textures.exists('lavaWormSegment')) {
            console.error('ERROR: Failed to create lava worm textures!');
            return;
        }
        
        // Place 2 worms at strategic locations
        const groundY = 540; // Ground top Y position
        const wormPositions = [
            { x: 1200, y: groundY - 25 },  // Mid-level, first worm
            { x: 2800, y: groundY - 25 },  // Later area, second worm
        ];
        
        console.log('Creating lava worms at positions:', wormPositions);
        
        wormPositions.forEach((pos, index) => {
            // Create worm head
            const head = this.physics.add.sprite(pos.x, pos.y, 'lavaWormHead');
            console.log(`Creating worm ${index + 1} head at x:${pos.x}, y:${pos.y}`);
            head.setOrigin(0.5, 0.5);
            head.setCollideWorldBounds(false);
            head.setDepth(3);
            head.setVisible(true);
            head.setActive(true);
            
            // Set collision body size
            if (head.body) {
                head.body.setSize(35, 45);
                head.body.setOffset(2.5, 2.5);
                head.body.setGravityY(0);
                head.body.setImmovable(false);
            }
            
            // Create body segments (3 segments)
            const segments = [];
            const segmentSpacing = 30;
            for (let i = 0; i < 3; i++) {
                const segment = this.physics.add.sprite(
                    pos.x - (i + 1) * segmentSpacing, 
                    pos.y, 
                    'lavaWormSegment'
                );
                segment.setOrigin(0.5, 0.5);
                segment.setCollideWorldBounds(false);
                segment.setDepth(3);
                segment.setVisible(true);
                segment.setActive(true);
                
                if (segment.body) {
                    segment.body.setSize(30, 40);
                    segment.body.setOffset(2.5, 2.5);
                    segment.body.setGravityY(0);
                    segment.body.setImmovable(false);
                }
                
                segments.push(segment);
            }
            
            // Store worm properties
            head.segments = segments;
            head.spawnX = pos.x;
            head.spawnY = pos.y;
            head.direction = Math.random() > 0.5 ? 1 : -1; // Start moving left or right
            head.speed = 80; // Slithering speed
            head.maxMoveDistance = 200; // Move 200px in each direction
            head.health = 3; // Takes 3 hits to kill
            head.lastHitTime = 0; // Track last hit time to prevent rapid hits
            head.hitCooldown = 500; // 0.5 second cooldown between hits
            
            // Set initial texture based on starting direction
            const initialTexture = head.direction > 0 ? 'lavaWormHeadRight' : 'lavaWormHeadLeft';
            head.setTexture(initialTexture);
            head.lastTexture = initialTexture;
            console.log('Worm created, initial direction:', head.direction, 'texture:', initialTexture, 'texture exists:', this.textures.exists(initialTexture));
            head.isSubmerged = false;
            head.submergeTimer = 0;
            head.submergeCooldown = 6000; // Submerge every 6 seconds (more frequent)
            head.emergeTimer = 0;
            head.emergeDelay = 3000; // Stay submerged for 3 seconds
            head.warningTimer = 0;
            head.warningDuration = 1000; // Show warning for 1 second before emerging
            
            // Collide with ground
            if (this.ground) {
                this.physics.add.collider(head, this.ground);
                segments.forEach(seg => {
                    this.physics.add.collider(seg, this.ground);
                });
            }
            
            // Add overlap detector for player damage (with callback to prevent multiple triggers)
            this.physics.add.overlap(this.player, head, (player, wormPart) => {
                console.log('Overlap detected with worm head!');
                this.hitLavaWorm(head);
            }, null, this);
            
            segments.forEach(seg => {
                this.physics.add.overlap(this.player, seg, (player, wormPart) => {
                    console.log('Overlap detected with worm segment!');
                    this.hitLavaWorm(head);
                }, null, this);
            });
            
            // Store all parts together
            head.allParts = [head, ...segments];
            
            this.lavaWorms.add(head);
            segments.forEach(seg => this.lavaWorms.add(seg));
            
            console.log(`Worm ${index + 1} created with ${segments.length} segments. Head visible: ${head.visible}, active: ${head.active}`);
        });
        
        console.log('Lava worms created:', wormPositions.length, 'Total parts:', this.lavaWorms.children.entries.length);
    }
    
    createFireballTexture() {
        if (!this.textures.exists('fireball')) {
            const graphics = this.add.graphics();
            
            const size = 20;
            
            // Outer glow
            graphics.fillStyle(0xFFAA00, 0.8);
            graphics.fillCircle(size/2, size/2, size/2);
            
            // Inner core
            graphics.fillStyle(0xFFFF00, 1.0);
            graphics.fillCircle(size/2, size/2, size/3);
            
            // Bright center
            graphics.fillStyle(0xFFFFFF, 1.0);
            graphics.fillCircle(size/2, size/2, size/6);
            
            graphics.generateTexture('fireball', size, size);
            graphics.destroy();
            
            console.log('Fireball texture created');
        }
    }
    
    createDragonBossTexture() {
        if (!this.textures.exists('dragonBoss')) {
            const graphics = this.add.graphics();
            
            const width = 140;
            const height = 80;
            
            // Outer glow (lava aura) - fish shape
            graphics.fillStyle(0xFF6600, 0.3);
            graphics.fillEllipse(width/2, height/2, width * 0.95, height * 0.85);
            
            // Main fish body (oval, streamlined)
            graphics.fillStyle(0xFF4500); // Orange-red lava color
            graphics.fillEllipse(width/2, height/2, width * 0.8, height * 0.6);
            
            // Fish scales/texture (overlapping scales pattern)
            graphics.fillStyle(0xFF3300, 0.7);
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 6; col++) {
                    const scaleX = width * 0.2 + (col * width * 0.12);
                    const scaleY = height * 0.2 + (row * height * 0.15);
                    // Draw semi-circular scale
                    graphics.beginPath();
                    graphics.arc(scaleX, scaleY, 6, 0, Math.PI, false);
                    graphics.closePath();
                    graphics.fillPath();
                }
            }
            
            // Head (more rounded, fish-like)
            graphics.fillStyle(0xFF2200); // Darker red
            graphics.fillEllipse(width * 0.75, height/2, width * 0.3, height * 0.5);
            
            // Mouth (fish mouth opening)
            graphics.fillStyle(0xFF1100);
            graphics.fillEllipse(width * 0.88, height/2, width * 0.12, height * 0.2);
            
            // Eyes (fish eyes on sides of head)
            graphics.fillStyle(0xFFFF00, 0.9); // Bright yellow glow
            graphics.fillCircle(width * 0.7, height * 0.35, 7);
            graphics.fillCircle(width * 0.7, height * 0.65, 7);
            graphics.fillStyle(0xFF0000); // Red pupils
            graphics.fillCircle(width * 0.7, height * 0.35, 4);
            graphics.fillCircle(width * 0.7, height * 0.65, 4);
            // Eye highlights
            graphics.fillStyle(0xFFFFFF, 0.9);
            graphics.fillCircle(width * 0.7 + 2, height * 0.35 - 2, 2);
            graphics.fillCircle(width * 0.7 + 2, height * 0.65 - 2, 2);
            
            // Dorsal fin (top fin)
            graphics.fillStyle(0xFF5500, 0.8);
            graphics.beginPath();
            graphics.moveTo(width * 0.4, height * 0.1);
            graphics.lineTo(width * 0.5, height * 0.05);
            graphics.lineTo(width * 0.6, height * 0.1);
            graphics.lineTo(width * 0.55, height * 0.25);
            graphics.closePath();
            graphics.fillPath();
            // Dorsal fin spines
            graphics.lineStyle(2, 0xFF3300, 0.9);
            graphics.beginPath();
            graphics.moveTo(width * 0.45, height * 0.12);
            graphics.lineTo(width * 0.45, height * 0.2);
            graphics.strokePath();
            graphics.beginPath();
            graphics.moveTo(width * 0.55, height * 0.12);
            graphics.lineTo(width * 0.55, height * 0.2);
            graphics.strokePath();
            
            // Pectoral fins (side fins)
            graphics.fillStyle(0xFF5500, 0.7);
            // Left pectoral fin
            graphics.beginPath();
            graphics.moveTo(width * 0.3, height * 0.4);
            graphics.lineTo(width * 0.15, height * 0.35);
            graphics.lineTo(width * 0.2, height * 0.5);
            graphics.lineTo(width * 0.35, height * 0.5);
            graphics.closePath();
            graphics.fillPath();
            // Right pectoral fin
            graphics.beginPath();
            graphics.moveTo(width * 0.3, height * 0.6);
            graphics.lineTo(width * 0.15, height * 0.65);
            graphics.lineTo(width * 0.2, height * 0.5);
            graphics.lineTo(width * 0.35, height * 0.5);
            graphics.closePath();
            graphics.fillPath();
            
            // Pelvic fins (bottom fins, smaller)
            graphics.fillStyle(0xFF5500, 0.6);
            graphics.beginPath();
            graphics.moveTo(width * 0.35, height * 0.75);
            graphics.lineTo(width * 0.25, height * 0.8);
            graphics.lineTo(width * 0.3, height * 0.85);
            graphics.lineTo(width * 0.4, height * 0.8);
            graphics.closePath();
            graphics.fillPath();
            
            // Tail fin (caudal fin - large and forked)
            graphics.fillStyle(0xFF4500);
            graphics.beginPath();
            graphics.moveTo(width * 0.1, height/2);
            graphics.lineTo(0, height * 0.3);
            graphics.lineTo(width * 0.05, height * 0.4);
            graphics.lineTo(width * 0.1, height/2);
            graphics.closePath();
            graphics.fillPath();
            graphics.beginPath();
            graphics.moveTo(width * 0.1, height/2);
            graphics.lineTo(0, height * 0.7);
            graphics.lineTo(width * 0.05, height * 0.6);
            graphics.lineTo(width * 0.1, height/2);
            graphics.closePath();
            graphics.fillPath();
            // Tail fin details
            graphics.lineStyle(2, 0xFF3300, 0.8);
            graphics.beginPath();
            graphics.moveTo(width * 0.05, height * 0.4);
            graphics.lineTo(width * 0.05, height * 0.6);
            graphics.strokePath();
            
            // Anal fin (small fin near tail)
            graphics.fillStyle(0xFF5500, 0.6);
            graphics.beginPath();
            graphics.moveTo(width * 0.2, height * 0.7);
            graphics.lineTo(width * 0.15, height * 0.75);
            graphics.lineTo(width * 0.2, height * 0.8);
            graphics.lineTo(width * 0.25, height * 0.75);
            graphics.closePath();
            graphics.fillPath();
            
            // Lava glow effect (outer glow around fish)
            graphics.lineStyle(4, 0xFFAA00, 0.6);
            graphics.strokeEllipse(width/2, height/2, width * 0.8, height * 0.6);
            
            graphics.generateTexture('dragonBoss', width, height);
            graphics.destroy();
            
            console.log('Fish boss texture created!');
        }
    }
    
    createDragonBoss() {
        try {
            if (this.dragonBoss) {
                return; // Already created
            }
            
            if (!this.dragonFireballs || !this.reflectedFireballs) {
                console.error('Dragon fireball groups not initialized!');
                return;
            }
            
            const arenaCenterX = this.bossArenaCenterX || 3500;
            const spawnY = 250; // Above platforms
            
            console.log('Creating dragon at:', arenaCenterX, spawnY, 'Arena center:', this.bossArenaCenterX, 'Arena radius:', this.bossArenaRadius);
            
            // Check if texture exists
            if (!this.textures.exists('dragonBoss')) {
                console.error('Dragon boss texture does not exist! Creating it now...');
                this.createDragonBossTexture();
            }
            
            // Create dragon sprite
            this.dragonBoss = this.physics.add.sprite(arenaCenterX, spawnY, 'dragonBoss');
            this.dragonBoss.setOrigin(0.5, 0.5);
            this.dragonBoss.setDepth(10);
            this.dragonBoss.setVisible(true);
            this.dragonBoss.setActive(true);
            
            console.log('Dragon sprite created:', this.dragonBoss.x, this.dragonBoss.y, 'Visible:', this.dragonBoss.visible, 'Active:', this.dragonBoss.active);
            
            // Dragon properties
            this.dragonBoss.health = 3; // Takes 3 hits to kill
            this.dragonBoss.maxHealth = 3;
            console.log('Dragon health initialized to:', this.dragonBoss.health);
            this.dragonBoss.speed = 80;
            this.dragonBoss.direction = 1; // 1 = right, -1 = left
            this.dragonBoss.state = 'patrol'; // 'patrol', 'pursuit', 'attacking', 'diving'
            this.dragonBoss.lastFireballTime = 0;
            this.dragonBoss.fireballCooldown = 7000; // 7 seconds between shots (reduced fire rate)
            this.dragonBoss.patrolLeftX = arenaCenterX - 400;
            this.dragonBoss.patrolRightX = arenaCenterX + 400;
            // Get arena floor to set proper boundaries
            const arenaFloorY = this.bossArenaFloorY || 540;
            
            this.dragonBoss.minY = 200;
            this.dragonBoss.maxY = 350;
            // Dive Y should be low but above the floor (at least 100px above floor)
            this.dragonBoss.diveY = Math.min(420, arenaFloorY - 100); // Low altitude for diving, but above floor
            this.dragonBoss.targetY = spawnY;
            this.dragonBoss.isDead = false;
            this.dragonBoss.isDiving = false;
            this.dragonBoss.lastDiveTime = 0;
            this.dragonBoss.diveCooldown = 4000; // Dive every 4 seconds
            this.dragonBoss.diveDuration = 2000; // Stay low for 2 seconds
            this.dragonBoss.isFlashing = false; // Track if currently flashing
            this.dragonBoss.lastStompTime = 0; // Cooldown for stomp hits
            
            // Disable gravity for flying and make body immovable
            if (this.dragonBoss.body) {
                this.dragonBoss.body.setGravityY(0);
                this.dragonBoss.body.setCollideWorldBounds(false);
                this.dragonBoss.body.setImmovable(true); // Prevent physics interactions
                // Ensure no initial velocity
                this.dragonBoss.body.setVelocity(0, 0);
            }
            
            // Add collider with ground to prevent falling through (as backup)
            if (this.ground && this.dragonBoss.body) {
                this.physics.add.collider(this.dragonBoss, this.ground, (dragon, groundObj) => {
                    // If fish hits ground, push it up
                    const arenaFloorY = this.bossArenaFloorY || 540;
                    const minY = arenaFloorY - 100;
                    if (dragon.y >= arenaFloorY - 50) {
                        dragon.y = minY;
                        if (dragon.body) {
                            dragon.body.y = minY;
                            dragon.body.setVelocityY(0);
                        }
                    }
                });
            }
            
            // Set up collision with player (check for stomp vs damage)
            if (this.player) {
                this.physics.add.overlap(this.player, this.dragonBoss, (player, dragon) => {
                    if (this.handleDragonCollision) {
                        this.handleDragonCollision(player, dragon);
                    }
                }, null, this);
            }
            
            // Set up collision for reflected fireballs hitting dragon
            this.physics.add.overlap(this.reflectedFireballs, this.dragonBoss, (fireball, dragon) => {
                if (this.hitDragonWithFireball) {
                    this.hitDragonWithFireball(fireball, dragon);
                }
            }, null, this);
            
            // Set up collision for dragon fireballs with player (for reflection)
            if (this.player) {
                this.physics.add.overlap(this.player, this.dragonFireballs, (player, fireball) => {
                    if (this.reflectFireball) {
                        this.reflectFireball(player, fireball);
                    }
                }, null, this);
            }
            
            // Dragon fireballs go through walls/platforms - no collision with platforms, ground, or arena walls
            // They only collide with player (for reflection) and reflected fireballs can hit dragon
            // Fireballs are bullet-like: straight trajectory, no gravity, pass through all walls
            
            // Set up collision for reflected fireballs with platforms/ground
            if (this.platforms) {
                this.physics.add.collider(this.reflectedFireballs, this.platforms, (fireball, platform) => {
                    if (fireball && fireball.active) {
                        fireball.destroy();
                    }
                });
            }
            
            if (this.ground) {
                this.physics.add.collider(this.reflectedFireballs, this.ground, (fireball, groundObj) => {
                    // Only destroy the fireball, NEVER the ground
                    if (fireball && fireball.active && fireball !== this.ground && fireball !== groundObj) {
                        fireball.destroy();
                    }
                });
            }
        
            console.log('Dragon boss created at:', arenaCenterX, spawnY);
        } catch (error) {
            console.error('Error creating dragon boss:', error);
        }
    }
    
    reflectFireball(player, fireball) {
        if (!fireball || !fireball.active || !this.dragonBoss || !this.dragonBoss.active) return;
        
        // Check if player is moving upward (jumping into fireball) - tight timing window
        const playerVelocityY = player.body.velocity.y;
        const isJumpingInto = playerVelocityY < -50; // Moving upward
        
        if (isJumpingInto) {
            // Reflect the fireball back at the dragon
            const dx = this.dragonBoss.x - fireball.x;
            const dy = this.dragonBoss.y - fireball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // Remove from dragon fireballs, add to reflected fireballs
                this.dragonFireballs.remove(fireball);
                this.reflectedFireballs.add(fireball);
                
                // Change fireball to reflected state
                fireball.isReflected = true;
                fireball.setTint(0x00FF00); // Green tint to show it's reflected
                
                // Set velocity toward dragon
                const speed = 300;
                fireball.body.setVelocityX((dx / distance) * speed);
                fireball.body.setVelocityY((dy / distance) * speed);
                fireball.body.setGravityY(0); // No gravity for reflected fireballs
                
                console.log('Fireball reflected!');
            }
        } else {
            // Player hit by fireball normally - take damage
            if (!this.isInvincible && !this.invincibilityCheat) {
                this.takeDamage(1);
                this.updateHeartsDisplay();
                this.isInvincible = true;
                this.time.delayedCall(this.invincibilityDuration, () => {
                    this.isInvincible = false;
                });
                
                if (this.hitSound) {
                    this.hitSound.play();
                }
            }
            fireball.destroy();
        }
    }
    
    hitDragonWithFireball(fireball, dragon) {
        if (!fireball.active || !dragon.active || dragon.isDead) return;
        
        // Deal damage to dragon
        dragon.health -= 1;
        
        // Visual feedback (only if not already flashing)
        if (!dragon.isFlashing) {
            dragon.isFlashing = true;
            dragon.setTint(0xFFFFFF); // Flash white
            this.time.delayedCall(100, () => {
                if (dragon && dragon.active) {
                    dragon.clearTint();
                    dragon.isFlashing = false;
                }
            });
        }
        
        // Destroy fireball
        fireball.destroy();
        
        console.log('Dragon hit! Health:', dragon.health);
        
        // Check if dragon is dead
        if (dragon.health <= 0) {
            this.killDragonBoss(dragon);
        }
    }
    
    handleDragonCollision(player, dragon) {
        if (!dragon.active || dragon.isDead) return;
        
        const playerVelocityY = player.body.velocity.y;
        const playerY = player.y;
        const dragonY = dragon.y;
        const playerHeight = player.body ? player.body.height : 40;
        const dragonHeight = 80; // Approximate fish height
        
        // Check if player is stomping (falling fast and above dragon)
        const isStomping = playerVelocityY > 150 && playerY < dragonY - 20; // Falling fast and above the fish
        
        // Check if player is jumping up and hitting the bottom of the fish (platform bounce)
        const isJumpingUnder = playerVelocityY < -50 && playerY > dragonY - dragonHeight/2 && playerY < dragonY + dragonHeight/2;
        
        if (isStomping) {
            // Player stomped the fish - damage the fish!
            this.stompDragon(dragon);
        } else if (isJumpingUnder) {
            // Player jumped up and hit the bottom of the fish - bounce like a platform!
            player.body.setVelocityY(-400); // Bounce upward (like jumping on a platform)
            // No damage to player or fish
        } else if (!this.isInvincible && !this.invincibilityCheat) {
            // Player hit the fish from the side - damage player
            this.takeDamage(1);
            this.updateHeartsDisplay();
            this.isInvincible = true;
            this.time.delayedCall(this.invincibilityDuration, () => {
                this.isInvincible = false;
            });
            
            // Knockback
            const knockbackDir = (player.x < dragon.x) ? -1 : 1;
            player.body.setVelocityX(knockbackDir * 300);
            player.body.setVelocityY(-200);
            
            if (this.hitSound) {
                this.hitSound.play();
            }
        }
    }
    
    stompDragon(dragon) {
        if (!dragon.active || dragon.isDead) return;
        
        // Cooldown to prevent rapid flashing (only allow one hit per 300ms)
        const currentTime = this.time.now;
        if (!dragon.lastStompTime) dragon.lastStompTime = 0;
        if (currentTime - dragon.lastStompTime < 300) {
            return; // Still on cooldown, ignore this hit
        }
        dragon.lastStompTime = currentTime;
        
        // Deal damage to the fish
        const oldHealth = dragon.health;
        dragon.health -= 1;
        dragon.health = Math.max(0, dragon.health); // Ensure health doesn't go below 0
        console.log('Fish hit! Health:', oldHealth, '->', dragon.health);
        
        // Visual feedback - flash white (only if not already flashing)
        if (!dragon.isFlashing) {
            dragon.isFlashing = true;
            dragon.setTint(0xFFFFFF);
            this.time.delayedCall(100, () => {
                if (dragon && dragon.active) {
                    dragon.clearTint();
                    dragon.isFlashing = false;
                }
            });
        }
        
        // Bounce player up when stomping
        this.player.body.setVelocityY(-400); // Bounce up
        
        // Knockback the fish slightly
        const knockbackDir = (this.player.x < dragon.x) ? -1 : 1;
        dragon.body.setVelocityX(knockbackDir * 100);
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        console.log('Fish stomped! Health:', dragon.health);
        
        // Check if fish is dead
        if (dragon.health <= 0) {
            this.killDragonBoss(dragon);
        }
    }
    
    killDragonBoss(dragon) {
        if (dragon.isDead) return;
        
        dragon.isDead = true;
        this.bossDead = true;
        
        // Death animation - explode into particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const particle = this.add.circle(
                dragon.x + Math.cos(angle) * 30,
                dragon.y + Math.sin(angle) * 30,
                5,
                0xFF4500
            );
            particle.setDepth(15);
            
            this.tweens.add({
                targets: particle,
                x: dragon.x + Math.cos(angle) * 100,
                y: dragon.y + Math.sin(angle) * 100,
                alpha: 0,
                scale: 0,
                duration: 1000,
                onComplete: () => {
                    if (particle && particle.active) {
                        particle.destroy();
                    }
                }
            });
        }
        
        // Destroy dragon
        this.time.delayedCall(500, () => {
            if (dragon && dragon.active) {
                dragon.destroy();
                this.dragonBoss = null; // Clear reference
            }
        });
        
        // Open arena doors and remove barriers
        console.log('Opening doors and removing barriers...');
        if (this.bossArenaLeftDoor && this.bossArenaRightDoor) {
            this.openBossArenaDoors();
            console.log('Doors opened');
        }
        
        // Disable player collision with arena walls so player can exit
        if (this.playerArenaWallCollider) {
            this.playerArenaWallCollider.destroy();
            this.playerArenaWallCollider = null;
            console.log('Wall collider destroyed');
        }
        
        // Also remove any remaining walls from the group and disable all colliders
        if (this.bossArenaWalls) {
            this.bossArenaWalls.children.entries.forEach(wall => {
                if (wall && wall.body) {
                    wall.body.enable = false;
                }
            });
            this.bossArenaWalls.clear(true, true);
            console.log('Arena walls group cleared');
        }
        
        // Force doors to be non-solid
        if (this.bossArenaLeftDoor && this.bossArenaLeftDoor.body) {
            this.bossArenaLeftDoor.body.enable = false;
            this.bossArenaLeftDoor.isOpen = true;
        }
        if (this.bossArenaRightDoor && this.bossArenaRightDoor.body) {
            this.bossArenaRightDoor.body.enable = false;
            this.bossArenaRightDoor.isOpen = true;
        }
        
        // Create finish flag at player's current position (with a small delay to ensure everything is ready)
        this.time.delayedCall(100, () => {
            if (this.player && this.player.active) {
                const playerX = this.player.x;
                const groundY = this.bossArenaFloorY || 540; // Use arena floor Y or default ground level
                
                // Destroy existing finish flag if it exists
                if (this.finishZone) {
                    try {
                        if (this.finishZone.parent) {
                            this.finishZone.destroy();
                        }
                        this.finishZone = null;
                    } catch (e) {
                        console.warn('Error destroying existing finish zone:', e);
                    }
                }
                
                // Place flag on the ground at player's X position
                console.log('Creating finish flag at player position. Player X:', playerX, 'Ground Y:', groundY);
                console.log('bossArenaFloorY:', this.bossArenaFloorY);
                try {
                    this.createFinishFlag(playerX, groundY);
                    console.log('Finish flag created successfully at:', playerX, groundY);
                } catch (error) {
                    console.error('Error creating finish flag:', error);
                    console.error('Error stack:', error.stack);
                }
            } else {
                console.error('Cannot create finish flag - player not available. Player:', this.player);
            }
        });
        
        // Play victory sound
        if (this.victorySound) {
            this.victorySound.play();
        }
        
        // Award points
        this.points += 500;
        this.updatePointsDisplay();
        
        console.log('Dragon boss defeated! Doors opened, barriers removed, finish flag created.');
    }
    
    shootDragonFireball(dragon) {
        if (!dragon || !dragon.active || dragon.isDead || !this.player || !this.player.active) return;
        
        // Spawn fireball from dragon's mouth/head area
        const spawnY = dragon.y - 10; // Slightly above dragon
        const fireball = this.physics.add.sprite(dragon.x, spawnY, 'fireball');
        fireball.setOrigin(0.5, 0.5);
        fireball.setDepth(5);
        fireball.isReflected = false;
        
        // Add to group first
        this.dragonFireballs.add(fireball);
        
        // Predict player position (smarter targeting)
        const playerVelocityX = this.player.body ? this.player.body.velocity.x : 0;
        const playerVelocityY = this.player.body ? this.player.body.velocity.y : 0;
        
        // Calculate distance to player
        const dx = this.player.x - dragon.x;
        const dy = this.player.y - dragon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0 && fireball.body) {
            // Enhanced prediction: Better lead targeting based on player movement patterns
            const fireballSpeed = 500; // Fast bullet speed (increased for better responsiveness)
            const timeToTarget = distance / fireballSpeed;
            
            // Calculate player acceleration for even better prediction
            const playerAccelX = this.player.body ? (this.player.body.velocity.x - playerVelocityX) : 0;
            const playerAccelY = this.player.body ? (this.player.body.velocity.y - playerVelocityY) : 0;
            
            // Enhanced prediction: account for velocity and acceleration
            // Use 80% prediction for velocity (more aggressive leading)
            // Add acceleration component for better prediction
            const predictionFactor = 0.8; // Increased from 0.6 for better leading
            const predictedX = this.player.x + (playerVelocityX * timeToTarget * predictionFactor) + (playerAccelX * timeToTarget * timeToTarget * 0.3);
            const predictedY = this.player.y + (playerVelocityY * timeToTarget * predictionFactor) + (playerAccelY * timeToTarget * timeToTarget * 0.3);
            
            // Calculate direction to predicted position
            const predDx = predictedX - dragon.x;
            const predDy = predictedY - dragon.y;
            const predDistance = Math.sqrt(predDx * predDx + predDy * predDy);
            
            if (predDistance > 0) {
                // Normalize direction
                const dirX = predDx / predDistance;
                const dirY = predDy / predDistance;
                
                // No gravity - straight bullet trajectory (goes through walls)
                fireball.body.setGravityY(0);
                
                // Set velocity straight at predicted position
                fireball.body.setVelocityX(dirX * fireballSpeed);
                fireball.body.setVelocityY(dirY * fireballSpeed);
                
                // Set physics body
                fireball.body.setSize(18, 18);
                fireball.body.setOffset(1, 1);
                
                // Mark fireball to go through walls (no collision with walls/platforms)
                fireball.ignoreWalls = true;
            }
        }
        
        // Add rotation animation (faster for bullet effect)
        this.tweens.add({
            targets: fireball,
            rotation: Math.PI * 2,
            duration: 200,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Add pulsing glow effect
        this.tweens.add({
            targets: fireball,
            scaleX: { from: 1, to: 1.3 },
            scaleY: { from: 1, to: 1.3 },
            duration: 200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Remove fireball after 4 seconds if it doesn't hit anything
        this.time.delayedCall(4000, () => {
            if (fireball && fireball.active) {
                fireball.destroy();
            }
        });
    }
    
    updateDragonBoss(deltaTime) {
        if (!this.dragonBoss) {
            return;
        }
        
        if (!this.dragonBoss.active || this.dragonBoss.isDead) {
            return;
        }
        
        if (!this.player || !this.player.active) {
            return;
        }
        
        // Make sure dragon is visible
        if (!this.dragonBoss.visible) {
            this.dragonBoss.setVisible(true);
        }
        
        // CRITICAL: Ensure gravity is ALWAYS disabled for flying fish
        // Do this every frame to prevent any world gravity from affecting it
        if (this.dragonBoss.body) {
            this.dragonBoss.body.setGravityY(0);
            this.dragonBoss.body.setImmovable(true); // Keep immovable
        }
        
        try {
            const dragon = this.dragonBoss;
            const arenaCenterX = this.bossArenaCenterX || 3500;
            const arenaRadius = this.bossArenaRadius || 600;
            
            // Keep dragon within arena bounds
            const minX = arenaCenterX - arenaRadius + 50;
            const maxX = arenaCenterX + arenaRadius - 50;
            
            // Calculate distance to player
            const dx = this.player.x - dragon.x;
            const dy = this.player.y - dragon.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Handle dive behavior
            const now = this.time.now;
            const timeSinceLastDive = now - dragon.lastDiveTime;
            
            // Check if it's time to dive
            if (!dragon.isDiving && timeSinceLastDive >= dragon.diveCooldown) {
                dragon.isDiving = true;
                dragon.lastDiveTime = currentTime;
                dragon.state = 'diving';
                console.log('Fish is diving!');
            }
            
            // Check if dive should end
            if (dragon.isDiving && timeSinceLastDive >= dragon.diveDuration) {
                dragon.isDiving = false;
                console.log('Fish dive ended, returning to normal');
            }
            
            // State determination (only if not diving)
            if (!dragon.isDiving) {
                if (distanceToPlayer < 300) {
                    dragon.state = 'aggressive'; // Very close - aggressive pursuit
                } else if (distanceToPlayer < 500) {
                    dragon.state = 'pursuit'; // Close - chase player
                } else if (distanceToPlayer < 800) {
                    dragon.state = 'strafe'; // Medium - strafe around player
                } else {
                    dragon.state = 'patrol'; // Far - patrol
                }
            }
            
            // Movement based on state - use direct position updates for vertical to prevent falling
            if (dragon.state === 'diving') {
                // Diving state - move down to low altitude for player to jump on
                const targetX = this.player.x; // Dive toward player
                const moveDir = targetX > dragon.x ? 1 : -1;
                dragon.direction = moveDir;
                
                // Move horizontally toward player while diving
                dragon.body.setVelocityX(moveDir * dragon.speed * 1.2);
                
                // Get arena floor to ensure we don't dive below it
                const arenaFloorY = this.bossArenaFloorY || 540;
                const minDiveY = arenaFloorY - 100; // At least 100px above floor
                
                // Dive down to low altitude (but not below floor)
                dragon.targetY = Math.max(dragon.diveY, minDiveY); // Ensure diveY is above floor
                
                // Use velocity for smooth vertical movement (faster dive)
                const yDiff = dragon.targetY - dragon.y;
                const maxSpeed = 80; // Max vertical speed
                const velY = Phaser.Math.Clamp(yDiff * 2, -maxSpeed, maxSpeed);
                
                // Don't allow movement below floor boundary
                const floorBoundary = arenaFloorY - 100;
                if (dragon.y >= floorBoundary - 5 && velY > 0) {
                    // About to go below floor, stop downward movement
                    if (dragon.body) {
                        dragon.body.setVelocityY(0);
                    }
                } else {
                    if (dragon.body) {
                        dragon.body.setVelocityY(velY);
                    }
                }
            } else if (dragon.state === 'patrol') {
                // Patrol left and right
                if (dragon.x <= dragon.patrolLeftX) {
                    dragon.direction = 1; // Move right
                } else if (dragon.x >= dragon.patrolRightX) {
                    dragon.direction = -1; // Move left
                }
                
                dragon.body.setVelocityX(dragon.direction * dragon.speed);
                
                // Slowly change altitude with smooth position updates
                dragon.targetY += Math.sin(this.time.now / 2000) * 0.5;
                dragon.targetY = Phaser.Math.Clamp(dragon.targetY, dragon.minY, dragon.maxY);
                
                // Use velocity for smooth vertical movement
                const yDiff = dragon.targetY - dragon.y;
                const maxSpeed = 40; // Max vertical speed
                const velY = Phaser.Math.Clamp(yDiff * 1.5, -maxSpeed, maxSpeed);
                
                if (dragon.body) {
                    dragon.body.setVelocityY(velY);
                }
            } else if (dragon.state === 'strafe') {
                // Enhanced strafe: Move in a circular pattern around player for better angles
                const playerDir = this.player.x > dragon.x ? 1 : -1;
                const timeBased = this.time.now / 1500; // Slower rotation
                // Create circular strafe pattern
                const strafeDir = Math.sin(timeBased) > 0 ? -playerDir : playerDir;
                dragon.direction = strafeDir;
                
                // Vary speed for more dynamic movement
                const speedMultiplier = 0.85 + (Math.sin(this.time.now / 800) * 0.15);
                dragon.body.setVelocityX(strafeDir * dragon.speed * speedMultiplier);
                
                // Maintain optimal altitude for shooting (slightly higher for better angles)
                dragon.targetY = this.player.y - 130;
                dragon.targetY = Phaser.Math.Clamp(dragon.targetY, dragon.minY, dragon.maxY);
                
                // Use velocity for smooth vertical movement
                const yDiff = dragon.targetY - dragon.y;
                const maxSpeed = 50;
                const velY = Phaser.Math.Clamp(yDiff * 1.5, -maxSpeed, maxSpeed);
                
                if (dragon.body) {
                    dragon.body.setVelocityY(velY);
                }
            } else if (dragon.state === 'pursuit') {
                // Enhanced pursuit: Smarter positioning with predictive movement
                const targetX = this.player.x;
                const moveDir = targetX > dragon.x ? 1 : -1;
                dragon.direction = moveDir;
                
                // Adaptive distance maintenance - get closer if player is moving away, back off if moving toward
                const playerMovingAway = (moveDir > 0 && playerVelocityX > 0) || (moveDir < 0 && playerVelocityX < 0);
                const optimalDistance = playerMovingAway ? 300 : 400; // Closer if player retreating
                
                if (distanceToPlayer > optimalDistance) {
                    // Chase with variable speed based on distance
                    const chaseSpeed = Math.min(1.4, 1.0 + (distanceToPlayer - optimalDistance) / 200);
                    dragon.body.setVelocityX(moveDir * dragon.speed * chaseSpeed);
                } else if (distanceToPlayer < optimalDistance - 50) {
                    // Too close, back away more aggressively
                    dragon.body.setVelocityX(-moveDir * dragon.speed * 0.8);
                } else {
                    // Good distance, maintain position with slight movement
                    dragon.body.setVelocityX(moveDir * dragon.speed * 0.3);
                }
                
                // Maintain optimal altitude above player (slightly higher for better shooting angles)
                dragon.targetY = this.player.y - 140;
                dragon.targetY = Phaser.Math.Clamp(dragon.targetY, dragon.minY, dragon.maxY);
                
                // Use velocity for smooth vertical movement
                const yDiff = dragon.targetY - dragon.y;
                const maxSpeed = 50;
                const velY = Phaser.Math.Clamp(yDiff * 1.5, -maxSpeed, maxSpeed);
                
                if (dragon.body) {
                    dragon.body.setVelocityY(velY);
                }
            } else if (dragon.state === 'aggressive') {
                // Enhanced aggressive: Rapid, unpredictable movement with optimal positioning
                const targetX = this.player.x;
                const moveDir = targetX > dragon.x ? 1 : -1;
                dragon.direction = moveDir;
                
                // More dynamic movement - alternate between closing in and strafing
                const aggressivePattern = Math.sin(this.time.now / 600);
                if (aggressivePattern > 0.3) {
                    // Close in aggressively
                    dragon.body.setVelocityX(moveDir * dragon.speed * 1.6);
                } else if (aggressivePattern < -0.3) {
                    // Quick strafe to side
                    dragon.body.setVelocityX(-moveDir * dragon.speed * 1.2);
                } else {
                    // Maintain position
                    dragon.body.setVelocityX(moveDir * dragon.speed * 0.5);
                }
                
                // Get closer to player for better shots, but not too close
                const optimalCloseDistance = 250;
                if (distanceToPlayer > optimalCloseDistance) {
                    dragon.targetY = this.player.y - 90;
                } else {
                    dragon.targetY = this.player.y - 110; // Back up slightly if too close
                }
                dragon.targetY = Phaser.Math.Clamp(dragon.targetY, dragon.minY, dragon.maxY);
                
                // Use velocity for smooth vertical movement
                const yDiff = dragon.targetY - dragon.y;
                const maxSpeed = 60;
                const velY = Phaser.Math.Clamp(yDiff * 1.5, -maxSpeed, maxSpeed);
                
                if (dragon.body) {
                    dragon.body.setVelocityY(velY);
                }
            }
            
            // Get arena floor Y to prevent falling through
            const arenaFloorY = this.bossArenaFloorY || 540;
            const floorBoundary = arenaFloorY - 100; // At least 100px above floor - absolute minimum
            
            // CRITICAL: Clamp position to arena bounds (including floor boundary) - do this FIRST
            dragon.x = Phaser.Math.Clamp(dragon.x, minX, maxX);
            
            // CRITICAL: Force Y position to never go below floor - use absolute minimum
            const absoluteMinY = Math.max(dragon.minY, floorBoundary);
            
            // Check BEFORE updating - prevent going below floor
            if (dragon.y >= arenaFloorY - 50) {
                dragon.y = floorBoundary;
                dragon.targetY = floorBoundary;
            }
            
            // Clamp Y position
            dragon.y = Phaser.Math.Clamp(dragon.y, absoluteMinY, dragon.maxY);
            
            // Also clamp targetY to prevent diving below floor
            dragon.targetY = Phaser.Math.Clamp(dragon.targetY, absoluteMinY, dragon.maxY);
            
            // CRITICAL: Always ensure gravity is disabled
            if (dragon.body) {
                dragon.body.setGravityY(0);
            }
            
            // EMERGENCY FLOOR CHECK: If somehow below floor, immediately correct it
            if (dragon.y >= arenaFloorY - 50) {
                console.warn('Fish below floor! Correcting position. Y:', dragon.y, 'Floor:', arenaFloorY);
                dragon.y = floorBoundary;
                dragon.targetY = floorBoundary;
                if (dragon.body) {
                    dragon.body.y = floorBoundary;
                    dragon.body.setVelocityY(0);
                }
            }
            
            // Prevent going below floor by clamping position after physics update
            if (dragon.y > floorBoundary) {
                dragon.y = floorBoundary;
                if (dragon.body) {
                    dragon.body.y = floorBoundary;
                    if (dragon.body.velocity.y > 0) {
                        dragon.body.setVelocityY(0);
                    }
                }
            }
            
            // Face direction
            if (dragon.direction > 0) {
                dragon.setFlipX(false);
            } else {
                dragon.setFlipX(true);
            }
            
            // Enhanced AI: Smarter fireball timing and adaptive behavior
            const currentTime = this.time.now;
            let fireballCooldown = dragon.fireballCooldown;
            
            // Track player movement patterns for better prediction
            if (!dragon.lastPlayerX) dragon.lastPlayerX = this.player.x;
            if (!dragon.lastPlayerY) dragon.lastPlayerY = this.player.y;
            const playerSpeedX = Math.abs(this.player.x - dragon.lastPlayerX);
            const playerSpeedY = Math.abs(this.player.y - dragon.lastPlayerY);
            dragon.lastPlayerX = this.player.x;
            dragon.lastPlayerY = this.player.y;
            
            // Adjust cooldown based on distance, state, and player movement (increased for less frequent shots)
            if (dragon.state === 'aggressive') {
                fireballCooldown = 5000; // Less frequent when aggressive
                // Burst fire when player is moving fast (harder to hit)
                if (playerSpeedX > 3 || playerSpeedY > 3) {
                    fireballCooldown = 4000; // Still reduced but faster than normal
                }
            } else if (dragon.state === 'pursuit') {
                fireballCooldown = 6000; // Less frequent
                // Faster shots if player is moving erratically
                if (playerSpeedX > 2) {
                    fireballCooldown = 5500;
                }
            } else if (dragon.state === 'strafe') {
                fireballCooldown = 6500; // Less frequent when strafing
            } else {
                fireballCooldown = 7000; // Less frequent when patrolling
            }
            
            // Shoot fireballs with smart timing and adaptive patterns (but not while diving)
            if (!dragon.isDiving && currentTime - dragon.lastFireballTime >= fireballCooldown) {
                // Only shoot if player is in reasonable range and has line of sight
                if (distanceToPlayer < 1000) {
                    // Check if player is moving - adjust prediction accordingly
                    const playerIsMoving = playerSpeedX > 0.5 || playerSpeedY > 0.5;
                    
                    // Shoot with better timing
                    this.shootDragonFireball(dragon);
                    dragon.lastFireballTime = currentTime;
                    
                    // Burst fire pattern when very close and player is moving fast
                    if (dragon.state === 'aggressive' && distanceToPlayer < 400 && (playerSpeedX > 2 || playerSpeedY > 2)) {
                        // Fire a second shot slightly delayed for burst pattern
                        this.time.delayedCall(300, () => {
                            if (dragon && dragon.active && !dragon.isDead && this.player && this.player.active) {
                                this.shootDragonFireball(dragon);
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error updating dragon boss:', error);
        }
    }
    
    dropFireball(bird) {
        if (!bird || !bird.active) return;
        
        // Create a fireball that falls from the bird
        const fireball = this.physics.add.sprite(bird.x, bird.y + 25, 'fireball');
        fireball.setOrigin(0.5, 0.5);
        fireball.setDepth(3);
        
        // Set physics body
        if (fireball.body) {
            fireball.body.setSize(18, 18);
            fireball.body.setOffset(1, 1);
            // Fireball falls down
            fireball.body.setGravityY(600);
        }
        
        // Add rotation animation
        this.tweens.add({
            targets: fireball,
            rotation: Math.PI * 2,
            duration: 500,
            repeat: -1
        });
        
        this.fireballs.add(fireball);
    }
    
    handleBirdCollision(player, bird) {
        if (bird.isDead) return;
        
        // Check if player is stomping (falling fast and above bird)
        const playerVelocityY = player.body.velocity.y;
        const isStomping = playerVelocityY > 100 && player.y < bird.y - 10;
        
        if (isStomping) {
            // Kill the bird
            this.killLavaBird(bird);
        } else {
            // Player takes damage
            this.hitLavaBird(bird);
        }
    }
    
    killLavaBird(bird) {
        if (bird.isDead) return;
        
        bird.isDead = true;
        bird.setTint(0x666666); // Gray out
        bird.setAlpha(0.5);
        
        // Stop movement
        if (bird.body) {
            bird.body.setVelocityX(0);
            bird.body.setVelocityY(0);
        }
        
        // Make bird fall (enable gravity only when dead)
        if (bird.body) {
            bird.body.setGravityY(800);
            // Add collision when dead so it can fall and hit ground
            if (this.ground) {
                this.physics.add.collider(bird, this.ground);
            }
        }
        
        // Destroy after a delay
        this.time.delayedCall(2000, () => {
            if (bird && bird.active) {
                bird.destroy();
            }
        });
        
        // Award points
        this.points += 50;
        this.updatePointsDisplay();
        
        console.log('Lava bird killed!');
    }
    
    hitFireball(fireball) {
        if (!fireball.active) return;
        
        // Check if player is invincible (normal or cheat)
        if (this.isInvincible || this.invincibilityCheat) {
            fireball.destroy();
            return;
        }
        
        // Deal 1 heart damage
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Apply knockback
        const knockbackDir = (this.player.x < fireball.x) ? -1 : 1;
        this.player.body.setVelocityX(knockbackDir * 300);
        this.player.body.setVelocityY(-200);
        
        // Destroy fireball
        fireball.destroy();
        
        // Death check is now handled in takeDamage() function
        
        console.log('Player hit by fireball! Hearts remaining:', this.hearts);
    }

    hitLavaBird(bird) {
        // Check if player is invincible (normal or cheat)
        if (this.isInvincible || this.invincibilityCheat) {
            return;
        }
        
        // Deal 1 heart damage
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Apply knockback
        const knockbackDir = (this.player.x < bird.x) ? -1 : 1;
        this.player.body.setVelocityX(knockbackDir * 300);
        this.player.body.setVelocityY(-200);
        
        // Death check is now handled in takeDamage() function
        
        console.log('Player hit by lava bird! Hearts remaining:', this.hearts);
    }

    hitLavaWorm(wormHead) {
        if (!wormHead || !wormHead.active || wormHead.isSubmerged) return;
        
        // Check if player is stomping (falling fast and above worm)
        const playerVelocityY = this.player.body.velocity.y;
        const isStomping = playerVelocityY > 100 && this.player.y < wormHead.y - 10;
        
        if (isStomping) {
            // Check cooldown to prevent rapid hits
            const currentTime = this.time.now;
            if (currentTime - wormHead.lastHitTime < wormHead.hitCooldown) {
                return; // Still on cooldown, ignore this hit
            }
            
            // Update last hit time
            wormHead.lastHitTime = currentTime;
            
            // Damage the worm
            wormHead.health -= 1;
            
            console.log('Worm hit! Health remaining:', wormHead.health);
            
            // Visual feedback - flash red
            this.tweens.add({
                targets: wormHead.allParts,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 1
            });
            
            // Swap sides - reverse direction when hit
            wormHead.direction *= -1;
            
            // Change texture to face new direction
            const newTexture = wormHead.direction > 0 ? 'lavaWormHeadRight' : 'lavaWormHeadLeft';
            wormHead.setTexture(newTexture);
            console.log('Worm hit! New direction:', wormHead.direction, 'texture:', newTexture);
            
            if (wormHead.health <= 0) {
                // Kill the worm
                this.killLavaWorm(wormHead);
            } else {
                // Play hit sound if available
                if (this.hitSound) {
                    this.hitSound.play();
                }
            }
        } else {
            // Player takes damage
            if (this.isInvincible || this.invincibilityCheat) {
                console.log('Player is invincible, skipping worm damage');
                return;
            }
            
            console.log('Player hit by worm! Taking damage. Hearts before:', this.hearts);
            this.takeDamage(1);
            this.updateHeartsDisplay(); // Update the visual display
            console.log('Hearts after:', this.hearts);
            this.isInvincible = true;
            
            // Visual feedback
            this.tweens.add({
                targets: this.player,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 5
            });
            
            // Play hit sound
            if (this.hitSound) {
                this.hitSound.play();
            }
            
            // End invincibility after duration
            this.time.delayedCall(this.invincibilityDuration, () => {
                this.isInvincible = false;
            });
            
            // Death check is now handled in takeDamage() function
        }
    }
    
    killLavaWorm(wormHead) {
        if (!wormHead || !wormHead.active) return;
        
        // Award points
        this.points += 150;
        this.updatePointsDisplay();
        
        // Destroy all parts
        wormHead.allParts.forEach(part => {
            if (part && part.active) {
                part.destroy();
            }
        });
        
        console.log('Lava worm killed! +150 points');
    }
    
    updateLavaWorms() {
        if (!this.lavaWorms) {
            return;
        }
        
        const deltaTime = this.game.loop.delta / 1000; // Convert to seconds
        
        // Process only worm heads (they have the segments property)
        const allParts = this.lavaWorms.children.entries;
        
        // Debug: Check what properties each part has (only once)
        if (!this.wormDebugLogged) {
            this.wormDebugLogged = true;
            console.log('=== WORM DEBUG ===');
            allParts.forEach((p, i) => {
                if (p) {
                    console.log(`Part ${i}:`, {
                        hasSegments: !!p.segments,
                        segmentsCount: p.segments ? p.segments.length : 0,
                        texture: p.texture ? p.texture.key : 'no texture',
                        x: p.x,
                        y: p.y
                    });
                }
            });
        }
        
        const heads = allParts.filter(part => part && part.segments);
        
        if (heads.length === 0) {
            // Log once to see why heads aren't found
            if (!this.wormNoHeadsLogged) {
                this.wormNoHeadsLogged = true;
                console.warn('No worm heads found! Total parts:', allParts.length);
            }
            return;
        }
        
        // Log first time we find heads
        if (!this.wormHeadsFoundLogged) {
            this.wormHeadsFoundLogged = true;
            console.log('Found', heads.length, 'worm heads! Starting updates...');
        }
        
        heads.forEach((head) => {
            if (!head.active || !head.body || !this.player) return;
            
            // Target the player - calculate direction to player
            const dx = this.player.x - head.x;
            const dy = this.player.y - head.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Always face the player, regardless of distance
            const dirX = dx / distance; // Normalize direction to player
            const newDirection = dirX > 0 ? 1 : -1; // 1 = right, -1 = left
            
            // Update direction immediately (for texture change)
            if (head.direction !== newDirection) {
                head.direction = newDirection;
                console.log('Worm direction changed to:', head.direction, 'player x:', this.player.x.toFixed(0), 'worm x:', head.x.toFixed(0), 'distance:', distance.toFixed(0));
            }
            
            // Only move if player is within range (not too far away)
            const maxFollowDistance = 2000; // Increased range so worms can follow from further away
            
            if (distance > 0 && distance < maxFollowDistance) {
                // Move toward player (only horizontally for now)
                head.x += dirX * head.speed * deltaTime;
            } else {
                // Player too far - move back toward spawn area
                const spawnDx = head.spawnX - head.x;
                const spawnDistance = Math.abs(spawnDx);
                
                if (spawnDistance > 10) {
                    const spawnDirX = spawnDx / spawnDistance;
                    head.x += spawnDirX * head.speed * 0.5 * deltaTime; // Slower when returning
                    // Direction already set above based on player position
                }
            }
            
            // Change texture based on direction - ALWAYS update every frame
            const newTexture = head.direction > 0 ? 'lavaWormHeadRight' : 'lavaWormHeadLeft';
            
            // Force texture update every frame
            if (this.textures.exists(newTexture)) {
                const currentTextureKey = head.texture ? head.texture.key : '';
                
                // Only update if texture actually changed
                if (currentTextureKey !== newTexture) {
                    // Force texture change with explicit refresh
                    head.setTexture(newTexture, 0); // Set frame 0 explicitly
                    head.setFrame(0); // Force frame update
                    
                    // Force a visual refresh
                    head.clearTint(); // Clear any tint that might be hiding the change
                    head.setVisible(true); // Ensure visible
                    head.setActive(true); // Ensure active
                    
                    console.log('TEXTURE CHANGED! From', currentTextureKey, 'to', newTexture, 'direction:', head.direction, 'head.x:', head.x.toFixed(0));
                }
            } else {
                console.error('Texture missing:', newTexture, 'Available textures:', this.textures.getTextureKeys().filter(k => k.includes('Worm')));
            }
            
            head.body.setVelocityX(0);
            head.body.setVelocityY(0);
            
            // Keep at ground level
            head.y = head.spawnY;
            
            // Update segments to follow head with delay (slithering effect)
            head.segments.forEach((segment, index) => {
                if (segment && segment.active) {
                    // Calculate target position (behind previous segment or head)
                    const targetX = index === 0 ? head.x - 30 : head.segments[index - 1].x - 30;
                    const targetY = head.spawnY;
                    
                    // Smoothly move segment toward target
                    const dx = targetX - segment.x;
                    const dy = targetY - segment.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 5) {
                        // Move segment toward target
                        const moveSpeed = head.speed * 0.8; // Slightly slower than head
                        segment.x += (dx / distance) * moveSpeed * deltaTime;
                        segment.y += (dy / distance) * moveSpeed * deltaTime;
                    } else {
                        segment.x = targetX;
                        segment.y = targetY;
                    }
                    
                    segment.body.setVelocityX(0);
                    segment.body.setVelocityY(0);
                }
            });
        });
    }
    
    updateLavaBirds() {
        // Update lava bird movement - follow player and drop fireballs
        if (!this.player) return;
        
        const currentTime = this.time.now;
        
        this.lavaBirds.children.entries.forEach((bird) => {
            if (!bird.active || !bird.body) return;
            
            // If bird is dead, let it fall (don't update movement)
            if (bird.isDead) {
                return;
            }
            
            // CRITICAL: Ensure gravity is ALWAYS disabled for living birds
            // Do this every frame to prevent any world gravity from affecting them
            if (bird.body) {
                bird.body.setGravityY(0);
                bird.body.setVelocityY(0); // Also ensure no Y velocity
            }
            
            // Calculate distance to player
            const dx = this.player.x - bird.x;
            const dy = this.player.y - bird.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Follow player if within range
            if (distance <= bird.followRange) {
                // Move towards player
                const deltaTime = this.game.loop.delta / 1000;
                const moveX = (dx / distance) * bird.speed * deltaTime;
                const moveY = (dy / distance) * bird.speed * deltaTime;
                
                bird.x += moveX;
                bird.y += moveY;
                
                // Keep velocities at 0 since we're moving by position
                bird.body.setVelocityX(0);
                bird.body.setVelocityY(0);
                
                // Flip sprite based on direction
                bird.setFlipX(dx < 0);
            }
            
            // Drop fireballs periodically
            if (currentTime - bird.lastFireballTime >= bird.fireballCooldown) {
                this.dropFireball(bird);
                bird.lastFireballTime = currentTime;
            }
        });
    }

    hitLavaCrab(crab) {
        // Check if player is invincible (normal or cheat)
        if (this.isInvincible || this.invincibilityCheat) {
            return;
        }
        
        // Deal 1 heart damage
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Apply knockback
        const knockbackDir = (this.player.x < crab.x) ? -1 : 1;
        this.player.body.setVelocityX(knockbackDir * 300);
        this.player.body.setVelocityY(-200);
        
        // Death check is now handled in takeDamage() function
        
        console.log('Player hit by lava crab! Hearts remaining:', this.hearts);
    }

    updateLavaCrabs() {
        // Update lava crab movement - side to side on ground
        this.lavaCrabs.children.entries.forEach((crab) => {
            if (!crab.active || !crab.body) return;
            
            // Track movement distance from spawn point
            const distanceFromSpawn = Math.abs(crab.x - crab.platformX);
            
            // Reverse direction if moved too far
            if (distanceFromSpawn >= crab.maxMoveDistance) {
                crab.direction *= -1;
            }
            
            // Move crab directly using position instead of velocity to avoid collision issues
            const deltaTime = this.game.loop.delta / 1000; // Convert to seconds
            crab.x += crab.direction * crab.speed * deltaTime;
            
            // Keep Y velocity at 0 (no falling, no jumping)
            crab.body.setVelocityY(0);
            // Also set X velocity to 0 since we're moving by position
            crab.body.setVelocityX(0);
            
            // Keep crab at ground Y level (prevent falling)
            // Ground top is at 540, so position crab on top of ground
            const groundTopY = 540;
            crab.y = groundTopY - 30;
            
            // Animate claws (clip when moving)
            // Initialize if not set
            if (crab.clawTimer === undefined) crab.clawTimer = 0;
            if (crab.clawState === undefined) crab.clawState = 0;
            
            crab.clawTimer += deltaTime * 10; // Speed of animation
            if (crab.clawTimer >= 1) {
                crab.clawState = 1 - crab.clawState; // Toggle between 0 and 1
                crab.clawTimer = 0;
                
                // Switch texture based on claw state
                if (crab.clawState === 0) {
                    if (this.textures.exists('lavaCrab')) {
                        crab.setTexture('lavaCrab'); // Claws open
                    }
                } else {
                    if (this.textures.exists('lavaCrabClosed')) {
                        crab.setTexture('lavaCrabClosed'); // Claws closed
                    }
                }
            }
            
            // Flip sprite based on direction
            crab.setFlipX(crab.direction < 0);
        });
    }

    addLavaGlow(x, y, width, height) {
        // Add glowing effect around lava ponds
        const glow = this.add.graphics();
        glow.fillStyle(0xFF4500, 0.2);
        glow.fillRect(x - width/2 - 10, y - height/2 - 10, width + 20, height + 20);
        glow.setDepth(1);
        
        // Animate the glow
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.2, to: 0.4 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    hitLava(lavaPond) {
        // Check if player is invincible (normal or cheat)
        if (this.isInvincible || this.invincibilityCheat) {
            return;
        }
        
        // Check cooldown (continuous damage while in lava)
        const currentTime = this.time.now;
        if (currentTime - this.lastLavaHitTime < this.lavaHitCooldown) {
            return; // Still in cooldown
        }
        
        this.lastLavaHitTime = currentTime;
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Deal damage (1 heart per hit, but with short cooldown for continuous damage)
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Apply knockback upward (lava pushes player up)
        this.player.body.setVelocityY(-300);
        
        // Death check is now handled in takeDamage() function
        
        console.log('Player hit by lava! Hearts remaining:', this.hearts);
    }

    takeDamage(amount) {
        // Check if invincibility cheat is active
        if (this.invincibilityCheat) {
            console.log('Invincibility cheat active - damage blocked!');
            return; // Don't take any damage
        }
        
        // Prioritize gold hearts first
        if (this.goldHearts > 0) {
            const goldDamage = Math.min(amount, this.goldHearts);
            this.goldHearts -= goldDamage;
            amount -= goldDamage;
        }
        
        // Then damage regular hearts
        if (amount > 0) {
            this.hearts -= amount;
            // Clamp hearts to 0 minimum
            this.hearts = Math.max(0, this.hearts);
        }
        
        console.log('Damage taken:', amount, 'Hearts:', this.hearts, 'Gold hearts:', this.goldHearts);
        
        // Check for death immediately after taking damage
        if (this.hearts <= 0) {
            console.log('Player died! Restarting level...');
            this.stopMusicBeforeRestart();
            this.time.delayedCall(300, () => {
                this.scene.restart();
            });
        }
    }

    createFinishFlag(finishX, platformY) {
        console.log('=== createFinishFlag called ===');
        console.log('finishX:', finishX, 'platformY:', platformY);
        
        const poleHeight = 120;
        const poleBaseY = platformY;
        const poleTopY = poleBaseY - poleHeight;
        const poleCenterY = poleBaseY - poleHeight/2;
        
        // Create pole (brown rectangle)
        const pole = this.add.rectangle(finishX, poleCenterY, 12, poleHeight, 0x654321);
        pole.setDepth(100); // Very high depth to ensure visibility
        pole.setScrollFactor(1, 1);
        pole.setVisible(true);
        pole.setActive(true);
        this.physics.add.existing(pole, true);
        console.log('Finish flag pole created at X:', finishX, 'Y:', poleCenterY, 'Height:', poleHeight);
        
        const flagWidth = 100;
        const flagHeight = 60;
        const checkerSize = 10;
        
        // Create checkered flag texture if it doesn't exist
        if (!this.textures.exists('checkeredFlag')) {
            console.log('Creating checkered flag texture...');
            const graphics = this.add.graphics();
            graphics.clear();
            
            const numCols = Math.ceil(flagWidth / checkerSize);
            const numRows = Math.ceil(flagHeight / checkerSize);
            
            for (let row = 0; row < numRows; row++) {
                for (let col = 0; col < numCols; col++) {
                    const x = col * checkerSize;
                    const y = row * checkerSize;
                    const isBlack = (row + col) % 2 === 0;
                    const color = isBlack ? 0x000000 : 0xFFFFFF;
                    graphics.fillStyle(color);
                    graphics.fillRect(x, y, checkerSize, checkerSize);
                }
            }
            
            graphics.lineStyle(3, 0x000000);
            graphics.strokeRect(0, 0, flagWidth, flagHeight);
            graphics.generateTexture('checkeredFlag', flagWidth, flagHeight);
            graphics.destroy();
            console.log('Checkered flag texture created');
        }
        
        // Create flag image
        const flag = this.add.image(finishX + 6, poleTopY, 'checkeredFlag');
        flag.setOrigin(0, 0.5);
        flag.setDepth(100); // Very high depth
        flag.setScrollFactor(1, 1);
        flag.setVisible(true);
        flag.setActive(true);
        console.log('Finish flag image created at X:', finishX + 6, 'Y:', poleTopY);
        
        // Make finish zone on the ground so player can reach it (make it more visible)
        const finishZoneY = platformY - 20; // Slightly above ground level
        const finishZone = this.add.rectangle(finishX, finishZoneY, 100, 40, 0xFFD700, 0.8); // Increased opacity
        this.physics.add.existing(finishZone, true);
        finishZone.setOrigin(0.5, 0.5);
        finishZone.setDepth(50); // High depth
        finishZone.setScrollFactor(1, 1);
        finishZone.setVisible(true);
        finishZone.setActive(true);
        finishZone.setStrokeStyle(5, 0xFF0000); // Red stroke to make it more visible
        console.log('Finish zone created at X:', finishX, 'Y:', finishZoneY);
        
        if (finishZone.body) {
            finishZone.body.setSize(100, 30);
            finishZone.body.setOffset(0, 0);
        }
        
        finishZone.platformY = platformY;
        this.finishZone = finishZone;
        
        // Set up overlap detection
        if (this.player) {
            this.physics.add.overlap(this.player, finishZone, this.reachFinish, null, this);
            console.log('Overlap detection set up between player and finish zone');
        } else {
            console.error('Player not available when setting up finish zone overlap');
        }
        
        console.log('=== createFinishFlag completed ===');
    }

    reachFinish(player, finishZone) {
        // Only complete level if boss is dead and player is actually on top of the platform
        if (!this.bossDead) {
            return; // Can't finish until boss is defeated
        }
        
        const playerBottom = player.y + (player.body.height / 2);
        const platformTop = finishZone.platformY - 10; // Top of platform
        
        if (playerBottom <= platformTop + 5 && player.body.touching.down) {
            if (!this.levelCompleted) {
                this.levelCompleted = true;
                this.showVictoryScreen();
            }
        }
    }

    showVictoryScreen() {
        // Store Level 3 points
        localStorage.setItem('level3Points', this.points.toString());
        
        // Get points from all levels
        const level1Points = parseInt(localStorage.getItem('level1Points') || '0', 10);
        const level2Points = parseInt(localStorage.getItem('level2Points') || '0', 10);
        const level3Points = this.points;
        
        // Calculate total points
        const totalPoints = level1Points + level2Points + level3Points;
        
        const screenX = this.cameras.main.centerX;
        const screenY = this.cameras.main.centerY;
        
        // Make background bigger for victory screen
        const bgRect = this.add.rectangle(screenX, screenY, 700, 400, 0x000000, 0.9);
        bgRect.setScrollFactor(0, 0);
        bgRect.setDepth(10000);
        
        // VICTORY text - bigger and more prominent
        const victoryText = this.add.text(screenX, screenY - 100, 'VICTORY!', {
            fontSize: '64px',
            fill: '#FFD700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        victoryText.setOrigin(0.5, 0.5);
        victoryText.setScrollFactor(0, 0);
        victoryText.setDepth(10000);
        
        // Total points text - larger and more prominent
        const victoryPointsText = this.add.text(screenX, screenY, `Total Points: ${totalPoints}`, {
            fontSize: '48px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        victoryPointsText.setOrigin(0.5, 0.5);
        victoryPointsText.setScrollFactor(0, 0);
        victoryPointsText.setDepth(10000);
        
        // Breakdown of points (optional, smaller text)
        const breakdownText = this.add.text(screenX, screenY + 60, `Level 1: ${level1Points} | Level 2: ${level2Points} | Level 3: ${level3Points}`, {
            fontSize: '20px',
            fill: '#CCCCCC',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        });
        breakdownText.setOrigin(0.5, 0.5);
        breakdownText.setScrollFactor(0, 0);
        breakdownText.setDepth(10000);
        
        const restartText = this.add.text(screenX, screenY + 80, this.isMobile ? 'Tap screen to play again' : 'Press R to restart', {
            fontSize: '24px',
            fill: '#FF4500',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        });
        restartText.setOrigin(0.5, 0.5);
        restartText.setScrollFactor(0, 0);
        restartText.setDepth(10000);
        
        this.victoryBgRect = bgRect;
        this.victoryText = victoryText;
        this.victoryPointsText = victoryPointsText;
        this.victoryBreakdownText = breakdownText;
        this.restartText = restartText;
        
        try {
            if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                this.backgroundMusic.pause();
            }
            
            if (this.victorySound) {
                const victorySoundInstance = this.victorySound.play();
                if (victorySoundInstance) {
                    const victoryDuration = victorySoundInstance.duration || 3000;
                    victorySoundInstance.once('complete', () => {
                        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                            this.backgroundMusic.resume();
                        }
                    });
                    this.time.delayedCall(victoryDuration, () => {
                        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                            this.backgroundMusic.resume();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error with victory music:', error);
        }
        
        this.input.keyboard.once('keydown-R', () => {
            this.levelCompleted = false;
            if (this.victoryBgRect) this.victoryBgRect.destroy();
            if (this.victoryText) this.victoryText.destroy();
            if (this.victoryPointsText) this.victoryPointsText.destroy();
            if (this.victoryBreakdownText) this.victoryBreakdownText.destroy();
            if (this.restartText) this.restartText.destroy();
            this.stopMusicBeforeRestart();
            this.scene.restart();
        });
        
        // On mobile: tap screen to play again
        if (this.isMobile) {
            this.input.once('pointerdown', () => {
                this.levelCompleted = false;
                if (this.victoryBgRect) this.victoryBgRect.destroy();
                if (this.victoryText) this.victoryText.destroy();
                if (this.victoryPointsText) this.victoryPointsText.destroy();
                if (this.victoryBreakdownText) this.victoryBreakdownText.destroy();
                if (this.restartText) this.restartText.destroy();
                this.stopMusicBeforeRestart();
                this.scene.restart();
            });
        }
    }

    createHeartsDisplay() {
        this.heartsGroup = this.add.group();
        this.updateHeartsDisplay();
    }

    updateHeartsDisplay() {
        // Clear existing hearts
        this.heartsGroup.clear(true, true);
        
        const heartSize = 30;
        const heartSpacing = 35;
        const startX = 750;
        const startY = 30;
        
        // Calculate full hearts and check for half heart
        const fullHearts = Math.floor(this.hearts);
        const hasHalfHeart = this.hearts % 1 >= 0.5;
        const totalHeartsToShow = fullHearts + (hasHalfHeart ? 1 : 0);
        
        // Display full hearts
        for (let i = 0; i < fullHearts; i++) {
            const heartX = startX - (totalHeartsToShow - i - 1) * heartSpacing;
            const heart = this.add.rectangle(heartX, startY, heartSize, heartSize, 0xFF0000);
            heart.setStrokeStyle(2, 0xFFFFFF);
            heart.setScrollFactor(0, 0);
            heart.setDepth(1000);
            this.heartsGroup.add(heart);
        }
        
        // Display half heart if there's a remainder
        if (hasHalfHeart) {
            const halfHeartX = startX - (totalHeartsToShow - fullHearts - 1) * heartSpacing;
            const halfHeartOutline = this.add.rectangle(halfHeartX, startY, heartSize, heartSize, 0x000000, 0);
            halfHeartOutline.setStrokeStyle(2, 0xFFFFFF);
            halfHeartOutline.setScrollFactor(0, 0);
            halfHeartOutline.setDepth(1000);
            this.heartsGroup.add(halfHeartOutline);
            
            // Fill left half
            const halfHeartFill = this.add.rectangle(halfHeartX - heartSize/4, startY, heartSize/2, heartSize, 0xFF0000);
            halfHeartFill.setScrollFactor(0, 0);
            halfHeartFill.setDepth(1000);
            this.heartsGroup.add(halfHeartFill);
        }
        
        // Display gold hearts
        const goldHeartStartX = startX - (totalHeartsToShow * heartSpacing) - 20;
        for (let i = 0; i < Math.floor(this.goldHearts); i++) {
            const goldHeartX = goldHeartStartX - (i * heartSpacing);
            const goldHeart = this.add.rectangle(goldHeartX, startY, heartSize, heartSize, 0xFFD700);
            goldHeart.setStrokeStyle(2, 0xFFFFFF);
            goldHeart.setScrollFactor(0, 0);
            goldHeart.setDepth(1000);
            this.heartsGroup.add(goldHeart);
        }
        
        // Display half gold heart if there's a remainder
        if (this.goldHearts % 1 >= 0.5) {
            const halfGoldHeartX = goldHeartStartX - (Math.floor(this.goldHearts) * heartSpacing);
            const halfGoldHeartOutline = this.add.rectangle(halfGoldHeartX, startY, heartSize, heartSize, 0x000000, 0);
            halfGoldHeartOutline.setStrokeStyle(2, 0xFFFFFF);
            halfGoldHeartOutline.setScrollFactor(0, 0);
            halfGoldHeartOutline.setDepth(1000);
            this.heartsGroup.add(halfGoldHeartOutline);
            
            const halfGoldHeartFill = this.add.rectangle(halfGoldHeartX - heartSize/4, startY, heartSize/2, heartSize, 0xFFD700);
            halfGoldHeartFill.setScrollFactor(0, 0);
            halfGoldHeartFill.setDepth(1000);
            this.heartsGroup.add(halfGoldHeartFill);
        }
    }

    createPointsDisplay() {
        this.pointsText = this.add.text(20, 20, 'Points: 0', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.pointsText.setScrollFactor(0, 0);
        this.pointsText.setDepth(1000);
    }

    updatePointsDisplay() {
        if (this.pointsText) {
            this.pointsText.setText(`Points: ${this.points}`);
        }
    }
    
    stopMusicBeforeRestart() {
        // Stop music before restarting to prevent overlap
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
        }
        // Also stop any duplicate instances
        if (this.game && this.game.sound && this.game.sound.sounds) {
            const bgMusicSounds = this.game.sound.sounds.filter(s => s && s.key === 'backgroundMusic');
            bgMusicSounds.forEach(sound => {
                if (sound && sound.isPlaying) {
                    sound.stop();
                }
            });
        }
    }

    update(time, delta) {
        if (this.levelCompleted) {
            return;
        }
        
        // Handle music toggle (M key)
        if (this.mKey && this.mKey.isDown && !this.mKeyJustPressed) {
            this.mKeyJustPressed = true;
            if (this.backgroundMusic) {
                if (this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.pause();
                    console.log('Music paused');
                } else {
                    this.backgroundMusic.resume();
                    console.log('Music resumed');
                }
            }
        } else if (this.mKey && !this.mKey.isDown && this.mKeyJustPressed) {
            this.mKeyJustPressed = false;
        }
        
        // Handle invincibility cheat (I key)
        if (this.iKey && this.iKey.isDown && !this.iKeyJustPressed) {
            this.iKeyJustPressed = true;
            this.invincibilityCheat = !this.invincibilityCheat;
            if (this.invincibilityCheat) {
                console.log('Invincibility cheat ACTIVATED');
            } else {
                console.log('Invincibility cheat DEACTIVATED');
            }
        } else if (this.iKey && !this.iKey.isDown && this.iKeyJustPressed) {
            this.iKeyJustPressed = false;
        }
        
        // Update lava ember animation
        this.updateLavaEmbers();
        
        // Update lava crabs
        this.updateLavaCrabs();
        
        // Update lava birds
        this.updateLavaBirds();
        
        // Update lava worms
        this.updateLavaWorms();
        
        // Handle boss arena door logic
        this.updateBossArenaDoors();
        
        // Prevent enemies from entering boss arena
        this.preventEnemiesInArena();
        
        // Update dragon boss
        if (this.dragonBoss && this.dragonBoss.active) {
            try {
                const deltaTime = delta || 16.67; // Default to ~60fps if delta not provided
                this.updateDragonBoss(deltaTime);
            } catch (error) {
                console.error('Error in updateDragonBoss:', error);
                // Disable dragon update if it's causing issues
                if (this.dragonBoss) {
                    this.dragonBoss.active = false;
                }
            }
        }
        
        // Check for lava damage (handled by overlap detector, but we can add visual updates here)
        
        if (this.player && this.player.y > 580) {
            this.stopMusicBeforeRestart();
            this.scene.restart();
            return;
        }
        
        let isMoving = false;
        
        if (this.cursors.left.isDown || this.wasd.A.isDown || this.mobileLeft) {
            this.player.setVelocityX(-this.playerSpeed);
            isMoving = true;
            this.facingDirection = -1;
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown || this.wasd.D.isDown || this.mobileRight) {
            this.player.setVelocityX(this.playerSpeed);
            isMoving = true;
            this.facingDirection = 1;
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }
        
        const isOnGround = this.player.body.touching.down;
        const isMovingUp = this.player.body.velocity.y < 0;
        const isMovingDown = this.player.body.velocity.y > 0;
        
        if ((this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown || this.mobileJump) && isOnGround) {
            this.player.setVelocityY(this.jumpSpeed);
        }
        
        if (!this.musicStarted && this.backgroundMusic && !this.backgroundMusic.isPlaying && (isMoving || (this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown || this.mobileJump))) {
            try {
                this.backgroundMusic.play();
                this.musicStarted = true;
                globalBackgroundMusic = this.backgroundMusic;
                backgroundMusicInitialized = true;
            } catch (error) {
                console.log('Could not start music:', error);
            }
        }
        
        this.updateAnimation(isOnGround, isMoving, isMovingUp, isMovingDown);
    }

    updateBossArenaDoors() {
        if (!this.bossArenaLeftDoor || !this.bossArenaRightDoor || !this.player) {
            return;
        }
        
        const arenaCenterX = this.bossArenaCenterX;
        const arenaRadius = this.bossArenaRadius;
        const playerX = this.player.x;
        const playerY = this.player.y;
        const floorY = this.bossArenaFloorY;
        
        // Check if player is inside the arena (within the dome radius)
        const distanceFromCenter = Math.sqrt(
            Math.pow(playerX - arenaCenterX, 2) + 
            Math.pow(playerY - floorY, 2)
        );
        const isInsideArena = distanceFromCenter < arenaRadius && playerY < floorY;
        
        // Check if player is at the arena edges (where the walls are)
        const leftWallX = this.bossArenaLeftDoor ? this.bossArenaLeftDoor.x : arenaCenterX - arenaRadius;
        const rightWallX = this.bossArenaRightDoor ? this.bossArenaRightDoor.x : arenaCenterX + arenaRadius;
        const wallThreshold = 50; // Distance to consider "at wall"
        
        // Check if player is near left wall (trying to exit left)
        const nearLeftWall = Math.abs(playerX - leftWallX) < wallThreshold && 
                            playerX < arenaCenterX && isInsideArena;
        
        // Check if player is near right wall (trying to exit right)
        const nearRightWall = Math.abs(playerX - rightWallX) < wallThreshold && 
                             playerX > arenaCenterX && isInsideArena;
        
        // Entry detection - close doors when player enters arena
        if (!this.bossArenaEntered && isInsideArena) {
            console.log('Player entering arena...');
            this.bossArenaEntered = true;
            this.closeBossArenaDoors();
            console.log('Doors closed, creating dragon...');
            // Spawn dragon boss when player enters arena (with small delay to ensure everything is ready)
            if (!this.dragonBoss) {
                this.time.delayedCall(100, () => {
                    console.log('Delayed call executing, creating dragon...');
                    try {
                        this.createDragonBoss();
                        console.log('Dragon creation completed');
                    } catch (error) {
                        console.error('Error in delayed dragon creation:', error);
                    }
                });
            }
            console.log('Player entered boss arena! Doors closed. Player at:', playerX, playerY, 'Distance from center:', distanceFromCenter.toFixed(1), 'Arena radius:', arenaRadius);
        }
        
        // Prevent player from leaving until boss is dead
        if (this.bossArenaEntered && !this.bossDead) {
            // Check if player tries to exit through the arena walls
            if (nearLeftWall || nearRightWall) {
                // Push player back into arena
                const pushDirection = playerX < arenaCenterX ? 1 : -1;
                this.player.body.setVelocityX(pushDirection * 200);
            }
            
            // Also check if player is outside arena bounds (push back)
            if (playerX < arenaCenterX - arenaRadius || playerX > arenaCenterX + arenaRadius) {
                const pushDirection = playerX < arenaCenterX ? 1 : -1;
                this.player.body.setVelocityX(pushDirection * 200);
            }
        }
        
        // If boss is dead, ensure doors are open and barriers are removed
        if (this.bossDead) {
            if (this.bossArenaLeftDoor && !this.bossArenaLeftDoor.isOpen) {
                this.openBossArenaDoors();
                console.log('Boss defeated! Doors opened.');
            }
            // Make sure wall collider is disabled
            if (this.playerArenaWallCollider) {
                this.playerArenaWallCollider.destroy();
                this.playerArenaWallCollider = null;
            }
        }
    }
    
    closeBossArenaDoors() {
        if (this.bossArenaLeftDoor) {
            this.bossArenaLeftDoor.isOpen = false;
            this.bossArenaLeftDoor.setActive(true);
            this.bossArenaLeftDoor.setVisible(false); // Keep invisible but solid
            if (this.bossArenaLeftDoor.body) {
                this.bossArenaLeftDoor.body.enable = true; // Make solid
            }
            // Add to walls group when closed
            if (!this.bossArenaWalls.contains(this.bossArenaLeftDoor)) {
                this.bossArenaWalls.add(this.bossArenaLeftDoor);
            }
            console.log('Left door closed (invisible barrier) at x:', this.bossArenaLeftDoor.x);
        }
        if (this.bossArenaRightDoor) {
            this.bossArenaRightDoor.isOpen = false;
            this.bossArenaRightDoor.setActive(true);
            this.bossArenaRightDoor.setVisible(false); // Keep invisible but solid
            if (this.bossArenaRightDoor.body) {
                this.bossArenaRightDoor.body.enable = true; // Make solid
            }
            // Add to walls group when closed
            if (!this.bossArenaWalls.contains(this.bossArenaRightDoor)) {
                this.bossArenaWalls.add(this.bossArenaRightDoor);
            }
            console.log('Right door closed (invisible barrier) at x:', this.bossArenaRightDoor.x);
        }
    }
    
    openBossArenaDoors() {
        if (this.bossArenaLeftDoor) {
            this.bossArenaLeftDoor.isOpen = true;
            this.bossArenaLeftDoor.setActive(true);
            this.bossArenaLeftDoor.setVisible(false); // Keep invisible
            if (this.bossArenaLeftDoor.body) {
                this.bossArenaLeftDoor.body.enable = false; // Non-solid when open
            }
            // Remove from walls group when open so player can pass through
            if (this.bossArenaWalls.contains(this.bossArenaLeftDoor)) {
                this.bossArenaWalls.remove(this.bossArenaLeftDoor);
            }
        }
        if (this.bossArenaRightDoor) {
            this.bossArenaRightDoor.isOpen = true;
            this.bossArenaRightDoor.setActive(true);
            this.bossArenaRightDoor.setVisible(false); // Keep invisible
            if (this.bossArenaRightDoor.body) {
                this.bossArenaRightDoor.body.enable = false; // Non-solid when open
            }
            // Remove from walls group when open so player can pass through
            if (this.bossArenaWalls.contains(this.bossArenaRightDoor)) {
                this.bossArenaWalls.remove(this.bossArenaRightDoor);
            }
        }
    }
    
    preventEnemiesInArena() {
        if (!this.bossArenaCenterX) {
            return;
        }
        
        const arenaCenterX = this.bossArenaCenterX;
        const arenaRadius = this.bossArenaRadius;
        const arenaFloorY = this.bossArenaFloorY;
        
        // Always prevent enemies from entering, not just after player enters
        
        // Check and remove/disable crabs in arena
        if (this.lavaCrabs) {
            this.lavaCrabs.children.entries.forEach((crab) => {
                if (crab && crab.active) {
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(crab.x - arenaCenterX, 2) + 
                        Math.pow(crab.y - arenaFloorY, 2)
                    );
                    if (distanceFromCenter < arenaRadius && crab.y < arenaFloorY) {
                        // Push crab out of arena or remove it
                        const pushAngle = Math.atan2(crab.y - arenaFloorY, crab.x - arenaCenterX);
                        crab.x = arenaCenterX + Math.cos(pushAngle) * (arenaRadius + 20);
                        crab.setVelocityX(0);
                        console.log('Crab pushed out of arena');
                    }
                }
            });
        }
        
        // Check and remove/disable birds in arena
        if (this.lavaBirds) {
            this.lavaBirds.children.entries.forEach((bird) => {
                if (bird && bird.active) {
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(bird.x - arenaCenterX, 2) + 
                        Math.pow(bird.y - arenaFloorY, 2)
                    );
                    if (distanceFromCenter < arenaRadius && bird.y < arenaFloorY) {
                        // Push bird out of arena
                        const pushAngle = Math.atan2(bird.y - arenaFloorY, bird.x - arenaCenterX);
                        bird.x = arenaCenterX + Math.cos(pushAngle) * (arenaRadius + 20);
                        bird.y = arenaFloorY - 100; // Move up
                        if (bird.body) {
                            bird.body.setVelocityX(0);
                            bird.body.setVelocityY(0);
                        }
                        console.log('Bird pushed out of arena');
                    }
                }
            });
        }
        
        // Check and remove/disable worms in arena
        if (this.lavaWorms) {
            this.lavaWorms.children.entries.forEach((wormPart) => {
                if (wormPart && wormPart.active) {
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(wormPart.x - arenaCenterX, 2) + 
                        Math.pow(wormPart.y - arenaFloorY, 2)
                    );
                    if (distanceFromCenter < arenaRadius && wormPart.y < arenaFloorY) {
                        // Push worm part out of arena (only if it's the head)
                        if (wormPart.segments) {
                            const pushAngle = Math.atan2(wormPart.y - arenaFloorY, wormPart.x - arenaCenterX);
                            wormPart.x = arenaCenterX + Math.cos(pushAngle) * (arenaRadius + 30);
                            if (wormPart.body) {
                                wormPart.body.setVelocityX(0);
                            }
                            console.log('Worm pushed out of arena');
                        }
                    }
                }
            });
        }
    }

    updateLavaEmbers() {
        // Animate embers with subtle movement
        this.lavaEmbers.children.entries.forEach((ember) => {
            ember.y += Math.sin(this.time.now * 0.001 + ember.x * 0.01) * 0.5;
            ember.alpha = 0.2 + Math.sin(this.time.now * 0.002 + ember.x * 0.01) * 0.1;
        });
    }

    updateAnimation(isOnGround, isMoving, isMovingUp, isMovingDown) {
        let newPose = 'idle';
        
        if (!isOnGround) {
            if (isMovingUp) {
                newPose = 'jumping';
            } else if (isMovingDown) {
                newPose = 'falling';
            }
        } else if (isMoving) {
            this.walkFrameCounter++;
            if (this.walkFrameCounter >= this.walkFrameDelay) {
                this.walkFrame = 1 - this.walkFrame;
                this.walkFrameCounter = 0;
            }
            newPose = this.walkFrame === 0 ? 'walking1' : 'walking2';
        }
        
        if (newPose !== this.currentPose) {
            this.currentPose = newPose;
            const textureKey = `stickman_${newPose}`;
            if (this.textures.exists(textureKey)) {
                this.player.setTexture(textureKey);
            }
        }
    }
}
