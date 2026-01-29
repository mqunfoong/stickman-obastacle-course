import Phaser from 'phaser';

// Global flag to track if background music has been initialized
let backgroundMusicInitialized = false;
let globalBackgroundMusic = null;

// Main game scene - this is where your game logic will go
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load background music (use absolute path for Vite)
        const musicPath = '/assets/sounds/background.mp3';
        console.log('Attempting to load music from:', musicPath);
        
        this.load.audio('backgroundMusic', musicPath);
        
        // Load hit sound effect (use absolute path for Vite)
        const hitSoundPath = '/assets/sounds/hit.mp3';
        this.load.audio('hitSound', hitSoundPath);
        
        // Load victory sound effect (use absolute path for Vite)
        const victorySoundPath = '/assets/sounds/victory.mp3';
        this.load.audio('victorySound', victorySoundPath);
        
        // Load Pringle image (use absolute path for Vite)
        this.load.image('pringle', '/assets/images/Pringle.png');
        
        // Debug: Check if file loads
        this.load.once('filecomplete-audio-backgroundMusic', () => {
            console.log('✓ Background music file loaded successfully!');
        });
        
        this.load.once('filecomplete-audio-hitSound', () => {
            console.log('✓ Hit sound file loaded successfully!');
        });
        
        this.load.once('filecomplete-audio-victorySound', () => {
            console.log('✓ Victory sound file loaded successfully!');
        });
        
        // Check if Pringle image loads
        this.load.once('filecomplete-image-pringle', () => {
            console.log('✓ Pringle image loaded successfully!');
        });
        
        this.load.once('loaderror', (file) => {
            console.error('✗ ERROR loading file:', file);
            if (file.key === 'backgroundMusic') {
                console.error('Could not load: assets/sounds/background.mp3');
                console.error('Check that the file exists and the server is running');
                console.error('Try accessing: http://localhost:8080/assets/sounds/background.mp3 in your browser');
            } else if (file.key === 'hitSound') {
                console.warn('⚠ Hit sound not found: assets/sounds/hit.mp3');
                console.warn('Game will continue without hit sound. Add the file to enable it.');
            } else if (file.key === 'victorySound') {
                console.warn('⚠ Victory sound not found: assets/sounds/victory.mp3');
                console.warn('Game will continue without victory sound. Add the file to enable it.');
            } else if (file.key === 'pringle') {
                console.error('✗ ERROR: Pringle image not found!');
                console.error('Expected path: assets/images/Pringle.png');
                console.error('Check that the file exists in your project folder');
            }
        });
        
        // Also listen for complete event
        this.load.once('complete', () => {
            console.log('All files loaded. Audio cache:', this.cache.audio.getKeys());
        });
    }

    create() {
        console.log('GameScene create() function called!');
        
        // Set world bounds - make the world much wider than the screen
        // Extend left to allow reaching the secret cloud
        // Allow player to fall through bottom so restart check can trigger
        this.physics.world.setBounds(-200, 0, 4200, 1000, true, true, false, false); // x, y, width, height, checkLeft, checkRight, checkUp, checkDown
        
        // Create the stickman player first
        this.createStickman();
        
        // Create platforms first (so we can access platform data)
        this.createPlatforms();
        
        // Set up camera to follow the player
        this.setupCamera();
        
        // Set up keyboard controls
        this.setupControls();
        
        // Player movement speed
        this.playerSpeed = 200; // Pixels per second
        this.jumpSpeed = -500; // Negative because up is negative Y in Phaser
        
        // Initialize hearts system
        this.hearts = 3.0; // Use float to support half-heart damage
        this.goldHearts = 0; // Track gold hearts from Pringle collection
        this.lastSpikeHitTime = 0;
        this.spikeHitCooldown = 3000; // 3 second cooldown between spike hits
        this.isInvincible = false; // Invincibility flag
        this.invincibilityDuration = 3000; // 3 seconds of invincibility after getting hurt
        this.createHeartsDisplay();
        
        // Initialize points system
        this.points = 0;
        this.collectedPlatforms = new Set(); // Track which platforms have been collected
        this.currentPlatform = null; // Track which platform player is currently on
        this.createPointsDisplay();
        
        // Initialize level completion flag
        this.levelCompleted = false;
        this.teleporting = false; // Flag to prevent multiple teleports
        
        // Initialize Pringle system
        this.pringle = null;
        this.pringleCollected = false;
        this.goldHearts = 0;
        this.pringlePlatform = null; // Reference to the Pringle platform
        this.onPringlePlatform = false; // Track if player is on Pringle platform
        this.pringlePlatformLandTime = 0; // Time when player landed on platform
        this.pringlePlatformTeleportDelay = 3000; // 3 seconds // Track gold hearts from Pringle collection
        
        // Create spikes texture
        this.createSpikeTexture();
        
        // Create turtle and pancake textures
        this.createTurtleTexture();
        this.createPancakeTexture();
        
        // Create enemies
        this.createEnemies();
        
        console.log('Stickman created!');
        
        // Initialize background music (but don't play it yet)
        // Music will start when player first moves and then never stop
        if (this.cache.audio.exists('backgroundMusic')) {
            // FIRST: Find ALL existing background music sounds
            let existingMusic = null;
            let playingMusic = null;
            const allMusicSounds = [];
            
            if (this.game && this.game.sound && this.game.sound.sounds) {
                for (let sound of this.game.sound.sounds) {
                    if (sound && sound.key === 'backgroundMusic') {
                        allMusicSounds.push(sound);
                        if (sound.isPlaying) {
                            playingMusic = sound; // Keep track of playing one
                        }
                        if (!existingMusic) {
                            existingMusic = sound; // Keep first one we find
                        }
                    }
                }
            }
            
            // Check global variable
            if (globalBackgroundMusic) {
                if (!existingMusic) {
                    existingMusic = globalBackgroundMusic;
                }
                if (globalBackgroundMusic.isPlaying && !playingMusic) {
                    playingMusic = globalBackgroundMusic;
                }
            }
            
            // If we found ANY existing music (playing or not), reuse it
            if (existingMusic) {
                // Stop and destroy any EXTRA instances (keep only one)
                if (allMusicSounds.length > 1) {
                    console.log(`Found ${allMusicSounds.length} music instances, destroying extras`);
                    for (let sound of allMusicSounds) {
                        if (sound !== existingMusic) {
                            try {
                                sound.stop();
                                sound.destroy();
                            } catch (e) {}
                        }
                    }
                }
                
                // Use the existing music
                this.backgroundMusic = existingMusic;
                globalBackgroundMusic = existingMusic;
                
                if (playingMusic) {
                    this.musicStarted = true; // Already playing
                    console.log('Music already playing, reusing it - will never stop');
                } else {
                    this.musicStarted = false; // Not playing yet, will start on movement
                    console.log('Found existing music (not playing), will start on first movement');
                }
                return; // Don't create new music
            }
            
            // No existing music found - create music object but don't play it yet
            this.backgroundMusic = this.sound.add('backgroundMusic', { 
                loop: true, 
                volume: 0.5
            });
            
            // Store globally
            globalBackgroundMusic = this.backgroundMusic;
            this.musicStarted = false; // Will start when player moves
            console.log('Background music created, will start on first player movement');
        } else {
            console.error('✗ Background music NOT found in cache!');
        }
        
        // Create hit sound effect (if available)
        if (this.cache.audio.exists('hitSound')) {
            this.hitSound = this.sound.add('hitSound', { 
                volume: 0.7 // Slightly louder than music for impact
            });
            console.log('✓ Hit sound created');
        } else {
            console.warn('⚠ Hit sound not available in cache');
            this.hitSound = null;
        }
        
        // Create victory sound effect (if available)
        if (this.cache.audio.exists('victorySound')) {
            this.victorySound = this.sound.add('victorySound', { 
                volume: 0.8 // Slightly louder for celebration
            });
            console.log('✓ Victory sound created');
        } else {
            console.warn('⚠ Victory sound not available in cache');
            this.victorySound = null;
        }
    }

    setupCamera() {
        // Make the camera follow the player
        // Extend bounds to the left to allow reaching the secret cloud
        // Extend bounds downward to allow reaching the Pringle (y: 780)
        this.cameras.main.setBounds(-200, 0, 4200, 880); // Camera can move left to -200, down to y=880 for Pringle
        
        // Store starting position
        this.playerStartX = 100;
        this.cameraFollowLeft = false; // Don't follow left initially
        
        // Start following player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(400, 300);
    }

    setupControls() {
        // Detect if device supports touch (mobile/tablet)
        const hasTouch = this.sys.game.device.input.touch;
        const isSmallScreen = this.cameras.main.width <= 768;
        this.isMobile = hasTouch || isSmallScreen;
        console.log('Device detection - Touch:', hasTouch, 'Small screen:', isSmallScreen, 'Is mobile:', this.isMobile);
        
        // Create keyboard input
        // Arrow keys
        this.cursors = this.input.keyboard.createCursorKeys();
        // M key for music toggle
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.mKeyJustPressed = false;
        
        // WASD keys (alternative controls)
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Spacebar for jumping
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Victory screen keys (created early so they're always available)
        this.nKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.nKeyJustPressed = false;
        this.rKeyJustPressed = false;
        
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
        
        // Jump icon (up arrow or "JUMP")
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
            // Create all the different stickman poses
            this.createStickmanPose('stickman_idle', 'idle');
            this.createStickmanPose('stickman_walking1', 'walking1'); // Left leg forward
            this.createStickmanPose('stickman_walking2', 'walking2'); // Right leg forward
            this.createStickmanPose('stickman_jumping', 'jumping');
            this.createStickmanPose('stickman_falling', 'falling');
            
            // Now create a sprite from the idle texture
            this.player = this.physics.add.sprite(100, 400, 'stickman_idle'); // Start higher up
            
            // Set the origin point (where the sprite is "anchored")
            this.player.setOrigin(0.5, 0.5);
            
            // Make the player collide with world bounds (can't go off left/right edges)
            this.player.setCollideWorldBounds(true);
            
            // Set drag (friction) so player slows down when not pressing keys
            this.player.setDragX(500);
            
            // Track current animation state
            this.currentPose = 'idle';
            
            // Walking animation counter (alternates between walking1 and walking2)
            this.walkFrame = 0;
            this.walkFrameCounter = 0;
            this.walkFrameDelay = 8; // Change frame every 8 ticks (adjust for speed)
            
            // Track facing direction (1 = right, -1 = left)
            this.facingDirection = 1; // Start facing right
            
            console.log('Stickman created successfully!');
        } catch (error) {
            console.error('Error creating stickman:', error);
        }
    }

    createStickmanPose(textureName, pose) {
        // Create a graphics object to draw our stickman
        const graphics = this.add.graphics();
        
        // Set the drawing color to black
        graphics.fillStyle(0x000000); // Black color
        
        // STICKMAN PARTS:
        // We'll draw centered in the graphics, then position the sprite
        const centerX = 25; // Center of our 50px wide texture
        const centerY = 10; // Top of our stickman
        
        // 1. HEAD - a circle (same for all poses)
        const headX = centerX;
        const headY = centerY + 8; // 8px from top
        const headRadius = 8; // Size of head
        graphics.fillCircle(headX, headY, headRadius);
        
        // 1.5. EYE BALL - white ball on the front of the face (right side by default)
        graphics.fillStyle(0xFFFFFF); // White color for the eye
        const eyeRadius = 3; // Size of the eye ball
        const eyeX = headX + headRadius - 2; // Position on right side of head (front)
        const eyeY = headY; // Center vertically on head
        graphics.fillCircle(eyeX, eyeY, eyeRadius);
        
        // 1.6. PUPIL - black ball inside the white eye
        graphics.fillStyle(0x000000); // Black color for the pupil
        const pupilRadius = 2; // Size of the pupil (smaller than the eye)
        graphics.fillCircle(eyeX, eyeY, pupilRadius);
        
        // Keep black for the rest of the body
        graphics.fillStyle(0x000000);
        
        // 2. BODY - a vertical rectangle (same for all poses)
        const bodyX = headX;
        const bodyY = headY + headRadius; // Start below the head
        const bodyWidth = 6;
        const bodyHeight = 20;
        graphics.fillRect(bodyX - bodyWidth/2, bodyY, bodyWidth, bodyHeight);
        
        // 3. ARMS - position changes based on pose
        // Only draw arms for jumping and falling poses
        if (pose === 'jumping') {
            // JUMPING: Arms up (angled upward)
            const armY = bodyY + 5; // Position arms partway down body
            const armLength = 12;
            const armWidth = 4;
            // Left arm (up and out)
            graphics.fillRect(bodyX - bodyWidth/2 - 8, armY - 8, armLength, armWidth);
            // Right arm (up and out)
            graphics.fillRect(bodyX + bodyWidth/2 - 4, armY - 8, armLength, armWidth);
        } else if (pose === 'falling') {
            // FALLING: Arms down (angled downward)
            const armY = bodyY + 5; // Position arms partway down body
            const armLength = 12;
            const armWidth = 4;
            // Left arm (down and out)
            graphics.fillRect(bodyX - bodyWidth/2 - 8, armY + 8, armLength, armWidth);
            // Right arm (down and out)
            graphics.fillRect(bodyX + bodyWidth/2 - 4, armY + 8, armLength, armWidth);
        }
        // IDLE and WALKING: No arms (don't draw anything)
        
        // 4. LEGS - position changes based on pose
        const legStartY = bodyY + bodyHeight; // Start at bottom of body
        const legLength = 18;
        const legWidth = 5;
        
        if (pose === 'walking1') {
            // WALKING 1: Left leg forward, right leg back
            const legSpacing = 6; // More spacing for walking
            // Left leg (forward - raised)
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY - 3, legWidth, legLength);
            // Right leg (back - on ground)
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY + 2, legWidth, legLength);
        } else if (pose === 'walking2') {
            // WALKING 2: Right leg forward, left leg back
            const legSpacing = 6; // More spacing for walking
            // Left leg (back - on ground)
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY + 2, legWidth, legLength);
            // Right leg (forward - raised)
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY - 3, legWidth, legLength);
        } else {
            // IDLE, JUMPING, FALLING: Normal legs together
            const legSpacing = 4; // Normal spacing
            // Left leg
            graphics.fillRect(bodyX - legSpacing - legWidth/2, legStartY, legWidth, legLength);
            // Right leg
            graphics.fillRect(bodyX + legSpacing - legWidth/2, legStartY, legWidth, legLength);
        }
        
        // Convert graphics to a texture
        graphics.generateTexture(textureName, 50, 60); // Create texture, 50x60 pixels
        
        // Clean up the graphics object
        graphics.destroy();
    }

    createPlatforms() {
        // Create a group to store all platforms
        this.platforms = this.physics.add.staticGroup();
        
        // Create spikes group for collision (before adding spikes)
        this.spikes = this.physics.add.staticGroup();
        
        // Platform properties
        const platformColor = 0x8B4513; // Brown color (same as ground)
        const platformHeight = 20; // Height of platforms
        const platformWidths = [100, 120, 140, 150, 160, 180, 200]; // Different widths for variety
        const worldWidth = 4000;
        
        // Seeded random number generator for consistent generation
        let seed = 12345; // Fixed seed for consistent results
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        
        // Jump physics calculations
        // Player can jump with velocity -500 and move at 200 pixels/second
        // Maximum horizontal jump distance is approximately: (jumpTime * horizontalSpeed)
        // Jump time = time to go up and come back down
        const jumpSpeed = 500; // Upward velocity
        const gravity = 800; // Gravity strength
        const horizontalSpeed = 200; // Movement speed while jumping
        const jumpTime = (2 * jumpSpeed) / gravity; // Total jump time (up + down)
        const maxJumpDistance = jumpTime * horizontalSpeed; // Maximum horizontal distance
        const safeJumpDistance = maxJumpDistance * 0.85; // Use 85% for safety margin
        
        // Helper function to get a random value from an array (using seeded random)
        const randomFromArray = (array) => array[Math.floor(seededRandom() * array.length)];
        
        // Helper function to get a random number between min and max (using seeded random)
        const randomBetween = (min, max) => seededRandom() * (max - min) + min;
        
        // Helper function to check if two platforms overlap or touch
        const platformsOverlap = (platform1, platform2) => {
            const minSpacing = 5; // Minimum spacing between platforms (in pixels)
            
            // Calculate the edges of each platform
            const p1Left = platform1.x - platform1.width / 2;
            const p1Right = platform1.x + platform1.width / 2;
            const p1Top = platform1.y - platformHeight / 2;
            const p1Bottom = platform1.y + platformHeight / 2;
            
            const p2Left = platform2.x - platform2.width / 2;
            const p2Right = platform2.x + platform2.width / 2;
            const p2Top = platform2.y - platformHeight / 2;
            const p2Bottom = platform2.y + platformHeight / 2;
            
            // Check if platforms overlap horizontally
            const horizontalOverlap = !(p1Right + minSpacing < p2Left || p2Right + minSpacing < p1Left);
            
            // Check if platforms overlap vertically
            const verticalOverlap = !(p1Bottom + minSpacing < p2Top || p2Bottom + minSpacing < p1Top);
            
            // Platforms touch/overlap if they overlap in both dimensions
            return horizontalOverlap && verticalOverlap;
        };
        
        // Helper function to check if a jump is possible between two platforms
        const canJumpBetween = (fromX, fromY, toX, toY) => {
            const horizontalDist = Math.abs(toX - fromX);
            const verticalDist = fromY - toY; // Positive if jumping up, negative if jumping down
            
            // Check horizontal distance
            if (horizontalDist > safeJumpDistance) {
                return false;
            }
            
            // Check vertical distance (can't jump too high)
            const maxJumpHeight = (jumpSpeed * jumpSpeed) / (2 * gravity); // Maximum jump height
            if (verticalDist > maxJumpHeight * 0.9) { // 90% of max height for safety
                return false;
            }
            
            // If jumping down, make sure it's not too far down (would take too long)
            if (verticalDist < -200) {
                return false;
            }
            
            return true;
        };
        
        // Generate platforms that are always reachable
        const platformData = [];
        let currentX = 150; // Start position
        let currentY = 450; // Start at medium height
        
        // Add starting platform
        const startWidth = randomFromArray(platformWidths);
        platformData.push({ x: currentX, y: currentY, width: startWidth });
        currentX += startWidth / 2; // Move to edge of starting platform
        
        // Generate platforms across the world
        while (currentX < worldWidth - 200) {
            // Calculate next platform position
            // Random distance forward (but within jump range)
            const minDistance = 180; // Minimum gap between platforms (increased for further jumps)
            const maxDistance = safeJumpDistance * 0.95; // Use 95% of max distance for longer jumps
            const distance = randomBetween(minDistance, maxDistance);
            
            const nextX = currentX + distance;
            
            // Random Y position (but ensure it's reachable)
            // Can be higher or lower, but within jump limits
            const maxHeightDiff = 150; // Maximum height difference
            const minY = Math.max(150, currentY - maxHeightDiff); // Can't go too high
            const maxY = Math.min(500, currentY + 100); // Can go down more than up
            let nextY = randomBetween(minY, maxY);
            
            // Ensure the jump is possible
            let attempts = 0;
            while (!canJumpBetween(currentX, currentY, nextX, nextY) && attempts < 10) {
                nextY = randomBetween(minY, maxY);
                attempts++;
            }
            
            // If we couldn't find a valid position, use a safe default
            if (attempts >= 10) {
                nextY = currentY + randomBetween(-50, 50); // Small variation
            }
            
            // Random width
            const width = randomFromArray(platformWidths);
            
            const newPlatform = { x: nextX, y: nextY, width: width };
            
            // Check if this platform overlaps with any existing platform
            let overlaps = false;
            for (const existingPlatform of platformData) {
                if (platformsOverlap(newPlatform, existingPlatform)) {
                    overlaps = true;
                    break;
                }
            }
            
            // Only add if it doesn't overlap
            if (!overlaps) {
                platformData.push(newPlatform);
            }
            
            // Sometimes create a branching path that goes upward
            if (seededRandom() > 0.75 && currentX > 500 && currentX < worldWidth - 1000) { // 25% chance, but not too early or late
                // Create an upward branching path
                const branchHeight = 120; // Height difference for the branch
                const branchY = currentY - branchHeight; // Higher up
                
                // Make sure branch height is reasonable
                if (branchY >= 150) {
                    // Create a platform to start the upward branch
                    const branchStartX = nextX + randomBetween(50, 100);
                    const branchWidth = randomFromArray(platformWidths);
                    const branchPlatform = { x: branchStartX, y: branchY, width: branchWidth };
                    
                    // Check if branch platform overlaps
                    let branchOverlaps = false;
                    for (const existingPlatform of platformData) {
                        if (platformsOverlap(branchPlatform, existingPlatform)) {
                            branchOverlaps = true;
                            break;
                        }
                    }
                    
                    // Check if branch is reachable
                    if (!branchOverlaps && canJumpBetween(nextX, nextY, branchStartX, branchY)) {
                        platformData.push(branchPlatform);
                        
                        // Continue the upward branch for a few platforms
                        let branchX = branchStartX + branchWidth / 2;
                        let branchCurrentY = branchY;
                        
                        for (let branchStep = 0; branchStep < 3 && branchX < worldWidth - 200; branchStep++) {
                            const branchDistance = randomBetween(150, safeJumpDistance * 0.9);
                            branchX += branchDistance;
                            
                            // Keep the branch at similar height or slightly varying
                            const branchNextY = branchCurrentY + randomBetween(-30, 30);
                            const branchNextYClamped = Math.max(150, Math.min(400, branchNextY));
                            
                            const branchNextWidth = randomFromArray(platformWidths);
                            const branchNextPlatform = { x: branchX, y: branchNextYClamped, width: branchNextWidth };
                            
                            // Check overlap
                            let branchNextOverlaps = false;
                            for (const existingPlatform of platformData) {
                                if (platformsOverlap(branchNextPlatform, existingPlatform)) {
                                    branchNextOverlaps = true;
                                    break;
                                }
                            }
                            
                            // Check if reachable from previous branch platform
                            if (!branchNextOverlaps && canJumpBetween(branchX - branchDistance, branchCurrentY, branchX, branchNextYClamped)) {
                                platformData.push(branchNextPlatform);
                                branchCurrentY = branchNextYClamped;
                            } else {
                                break; // Stop branch if can't continue
                            }
                        }
                    }
                }
            }
            
            // Sometimes add additional platforms at the same x position but different heights
            // This creates vertical options for the player (only above, not below)
            if (seededRandom() > 0.6) { // 40% chance to add extra platforms (using seeded random)
                const numExtra = Math.floor(seededRandom() * 2) + 1; // 1 or 2 extra platforms
                
                for (let i = 0; i < numExtra; i++) {
                    // Create platform at similar x position (more spread out)
                    const extraX = nextX + randomBetween(-100, 100);
                    
                    // Only create platforms above, never below
                    const heightVariation = randomBetween(80, 120);
                    const extraY = nextY - heightVariation; // Always above (lower y = higher on screen)
                    
                    // Make sure it's within reasonable bounds
                    const extraYClamped = Math.max(150, Math.min(500, extraY));
                    
                    const extraPlatform = { x: extraX, y: extraYClamped, width: randomFromArray(platformWidths) };
                    
                    // Check if it overlaps with any existing platform
                    let extraOverlaps = false;
                    for (const existingPlatform of platformData) {
                        if (platformsOverlap(extraPlatform, existingPlatform)) {
                            extraOverlaps = true;
                            break;
                        }
                    }
                    
                    // Check if it's reachable from the main platform and doesn't overlap
                    if (!extraOverlaps && (canJumpBetween(nextX, nextY, extraX, extraYClamped) || 
                        Math.abs(extraYClamped - nextY) < 100)) { // Allow if close vertically
                        platformData.push(extraPlatform);
                    }
                }
            }
            
            // Update current position to the edge of the new platform
            currentX = nextX + width / 2;
            currentY = nextY;
        }
        
        // Filter out platforms that are at the same x position but below another platform
        const filteredPlatformData = platformData.filter((platform, index) => {
            // Check if there's another platform at similar x position but higher (lower y value)
            for (let i = 0; i < platformData.length; i++) {
                if (i !== index) {
                    const otherPlatform = platformData[i];
                    // If platforms are at similar x position (within 50 pixels)
                    const xDistance = Math.abs(platform.x - otherPlatform.x);
                    if (xDistance < 50) {
                        // If this platform is below the other one (higher y value)
                        if (platform.y > otherPlatform.y) {
                            return false; // Remove this platform (the lower one)
                        }
                    }
                }
            }
            return true; // Keep this platform
        });
        
        // First pass: Determine which platforms will have spikes
        const platformsWithSpikeInfo = filteredPlatformData.map((platform, index) => {
            const isStartingPlatform = index === 0 || (platform.x >= 140 && platform.x <= 200 && platform.y >= 440 && platform.y <= 460);
            const isThirdPlatform = index === 2;
            const willHaveSpikes = !isStartingPlatform && !isThirdPlatform && seededRandom() > 0.5;
            return {
                ...platform,
                willHaveSpikes: willHaveSpikes,
                index: index
            };
        });
        
        // Second pass: Remove platforms without spikes that overlap with platforms that have spikes
        const finalPlatformData = platformsWithSpikeInfo.filter((platform, index) => {
            // Always keep platforms with spikes
            if (platform.willHaveSpikes) {
                return true;
            }
            
            // Calculate this platform's bounds
            const platformLeft = platform.x - platform.width / 2;
            const platformRight = platform.x + platform.width / 2;
            const platformTop = platform.y - platformHeight / 2;
            const platformBottom = platform.y + platformHeight / 2;
            
            // Check if this platform without spikes overlaps with a platform that has spikes
            for (let i = 0; i < platformsWithSpikeInfo.length; i++) {
                if (i === index) continue;
                
                const otherPlatform = platformsWithSpikeInfo[i];
                // Only check against platforms with spikes
                if (!otherPlatform.willHaveSpikes) continue;
                
                // Calculate other platform's bounds (account for extra width if it has spikes)
                const otherWidth = otherPlatform.willHaveSpikes ? otherPlatform.width + 40 : otherPlatform.width;
                const otherLeft = otherPlatform.x - otherWidth / 2;
                const otherRight = otherPlatform.x + otherWidth / 2;
                const otherTop = otherPlatform.y - platformHeight / 2;
                const otherBottom = otherPlatform.y + platformHeight / 2;
                
                // Check if platforms overlap horizontally
                const horizontalOverlap = !(platformRight < otherLeft || platformLeft > otherRight);
                
                // Check if platforms are at similar y position (within 50 pixels - practically on top of each other)
                const yDistance = Math.abs(platform.y - otherPlatform.y);
                const verticalOverlap = yDistance < 50;
                
                // Also check if platforms are very close together (center-to-center distance)
                const centerDistance = Math.sqrt(
                    Math.pow(platform.x - otherPlatform.x, 2) + 
                    Math.pow(platform.y - otherPlatform.y, 2)
                );
                const veryClose = centerDistance < 80; // Very close together
                
                // If platforms overlap horizontally and are at similar height, OR are very close together, remove the one without spikes
                if ((horizontalOverlap && verticalOverlap) || veryClose) {
                    // Remove this platform without spikes (keep the one with spikes)
                    console.log('Removing overlapping platform without spikes at x:', platform.x, 'y:', platform.y, 'width:', platform.width, 'because platform with spikes exists at x:', otherPlatform.x, 'y:', otherPlatform.y, 'width:', otherWidth, 'centerDistance:', centerDistance);
                    return false;
                }
            }
            
            return true; // Keep this platform
        });
        
        // Find the last platform (rightmost)
        let lastPlatformIndex = 0;
        let lastPlatformX = 0;
        finalPlatformData.forEach((platform, index) => {
            const platformRight = platform.x + (platform.willHaveSpikes ? platform.width + 40 : platform.width) / 2;
            if (platformRight > lastPlatformX) {
                lastPlatformX = platformRight;
                lastPlatformIndex = index;
            }
        });
        
        // Remove spikes from the last platform
        finalPlatformData[lastPlatformIndex].willHaveSpikes = false;
        console.log('Removed spikes from last platform at index:', lastPlatformIndex);
        
        // Create each platform
        let platformCounter = 0; // Counter for unique platform IDs
        let lastPlatformRect = null;
        finalPlatformData.forEach((platform, index) => {
            // Make platforms with spikes longer (add 40 pixels to width)
            const platformWidth = platform.willHaveSpikes ? platform.width + 40 : platform.width;
            
            const platformRect = this.add.rectangle(
                platform.x, 
                platform.y, 
                platformWidth, 
                platformHeight, 
                platformColor
            );
            
            // Store the width for later reference
            platformRect.width = platformWidth;
            
            // Make it a physics body
            this.physics.add.existing(platformRect, true); // true = static body
            
            // Add to platforms group
            this.platforms.add(platformRect);
            
            // Store reference to last platform
            if (index === lastPlatformIndex) {
                lastPlatformRect = platformRect;
            }
            
            // Add grass on top of each platform
            // Top of platform is at y: platform.y - platformHeight/2
            this.addGrass(platform.x, platform.y - platformHeight/2, platformWidth);
            
            // Store platform reference for point collection - ALL platforms get a unique ID
            const isStartingPlatform = platform.index === 0 || (platform.x >= 140 && platform.x <= 200 && platform.y >= 440 && platform.y <= 460);
            if (!isStartingPlatform) {
                // Store platform data with a unique ID for point collection
                platformRect.platformId = `platform_${platformCounter}`;
                platformCounter++; // Increment counter for next platform
            }
            
            // Add spikes to platforms (but not the last one)
            if (platform.willHaveSpikes && index !== lastPlatformIndex) {
                console.log('Adding spikes to platform at x:', platform.x, 'width:', platformWidth);
                // Update platform data with new width for spike placement
                const updatedPlatform = { ...platform, width: platformWidth };
                this.addSpikesToPlatform(updatedPlatform);
            }
        });
        
        // Store last platform reference for finish flag
        this.lastPlatform = lastPlatformRect;
        
        // Find second last platform for secret shortcut
        this.secondLastPlatform = null;
        const allPlatforms = [];
        this.platforms.getChildren().forEach((platform) => {
            if (platform && platform !== lastPlatformRect) {
                allPlatforms.push(platform);
            }
        });
        // Sort by x position and get second to last
        allPlatforms.sort((a, b) => b.x - a.x);
        if (allPlatforms.length > 0) {
            this.secondLastPlatform = allPlatforms[0]; // Second to last (since we excluded the last)
            console.log('Second last platform found at x:', this.secondLastPlatform.x, 'y:', this.secondLastPlatform.y);
        } else {
            console.warn('No second last platform found!');
        }
        
        // Create secret cloud platform at left edge
        this.createSecretCloud();
        
        // Progress bar disabled
        
        // Make player collide with all platforms
        this.physics.add.collider(this.player, this.platforms);
        
        // Make player overlap with spikes (to detect collision)
        this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
        
        // Make player overlap with secret cloud (to detect landing)
        if (this.secretCloud) {
            this.physics.add.overlap(this.player, this.secretCloud, this.landOnSecretCloud, null, this);
        }
        
        // Create finish flag at the end of the level
        console.log('=== ABOUT TO CREATE FINISH FLAG ===');
        console.log('lastPlatform exists?', this.lastPlatform !== null);
        if (this.lastPlatform) {
            console.log('lastPlatform at:', this.lastPlatform.x, this.lastPlatform.y);
        }
        try {
            this.createFinishFlag();
            console.log('=== FINISH FLAG CREATION COMPLETED ===');
        } catch (error) {
            console.error('ERROR creating finish flag:', error);
            console.error('Error stack:', error.stack);
            // Continue even if flag creation fails
        }
        
        // Add Pringle platform and Pringle
        this.addPringlePlatform();
    }
    
    addPringlePlatform() {
        // Create a platform below the starting platform, just off screen
        // Starting platform is at x: 150, y: 450
        // Screen height is 600px, so place platform at y: 780 (even further below visible area)
        const pringlePlatformX = 150; // Same x as starting platform
        const pringlePlatformY = 780; // Even further below the screen (screen bottom is 600)
        const pringlePlatformWidth = 140;
        const platformHeight = 20;
        const platformColor = 0x8B4513; // Brown color (same as other platforms)
        
        // Create the platform
        const pringlePlatform = this.add.rectangle(
            pringlePlatformX, 
            pringlePlatformY, 
            pringlePlatformWidth, 
            platformHeight, 
            platformColor
        );
        
        // Make it a physics body
        this.physics.add.existing(pringlePlatform, true); // true = static body
        
        // Set body size to match the rectangle dimensions
        if (pringlePlatform.body) {
            pringlePlatform.body.setSize(pringlePlatformWidth, platformHeight);
            pringlePlatform.body.setOffset(0, 0);
        }
        
        // Add to platforms group
        this.platforms.add(pringlePlatform);
        
        // Add grass on top
        this.addGrass(pringlePlatformX, pringlePlatformY - platformHeight/2, pringlePlatformWidth);
        
        // Add Pringle on the platform
        this.addPringle(pringlePlatformX, pringlePlatformY);
        
        // Store reference to the platform for teleportation logic
        this.pringlePlatform = pringlePlatform;
        
        // Debug: Verify platform was created
        console.log('Pringle platform created. X:', pringlePlatformX, 'Y:', pringlePlatformY, 
                   'Width:', pringlePlatformWidth, 'Height:', platformHeight, 'Body exists:', !!pringlePlatform.body);
    }
    
    addPringle(platformX, platformY) {
        console.log('=== addPringle called ===');
        console.log('Platform X:', platformX, 'Platform Y:', platformY);
        
        // Position Pringle slightly above the platform
        const pringleX = platformX;
        const pringleY = platformY - 40; // Slightly above the platform
        
        // Check what textures are available
        const allTextures = this.textures.list;
        console.log('Available textures:', Object.keys(allTextures));
        console.log('Checking if pringle texture exists...');
        
        if (this.textures.exists('pringle')) {
            console.log('✓ Pringle texture found! Creating image...');
            const pringle = this.add.image(pringleX, pringleY, 'pringle');
            pringle.setOrigin(0.5, 0.5);
            pringle.setDepth(10); // Above other elements
            
            // Scale the Pringle to a reasonable size
            // Original Pringle image might be large, so scale it down
            const targetWidth = 40; // Target width in pixels
            const originalWidth = pringle.width;
            const originalHeight = pringle.height;
            const scale = targetWidth / originalWidth;
            pringle.setScale(scale * 2);
            
            // Make it a physics body for collision detection
            this.physics.add.existing(pringle, true); // true = static
            pringle.body.setSize(pringle.width * pringle.scaleX, pringle.height * pringle.scaleY);
            
            // Store reference to Pringle
            this.pringle = pringle;
            this.pringleCollected = false; // Track if Pringle has been collected
            
            // Add overlap detector for collection
            this.physics.add.overlap(this.player, pringle, () => {
                if (!this.pringleCollected && pringle.active) {
                    console.log('OVERLAP DETECTED - Collecting Pringle!');
                    this.collectPringle(pringle);
                }
            }, null, this);
            
            console.log('✓ Pringle image added at x:', pringleX, 'y:', pringleY, 'scale:', scale);
            console.log('✓ Pringle reference stored:', !!this.pringle);
            console.log('=== addPringle completed successfully ===');
        } else {
            console.error('✗ Pringle texture NOT found!');
            console.error('Available textures:', Object.keys(allTextures));
            console.error('Make sure the file is in assets/images/Pringle.png');
            console.error('Check browser Network tab to see if the file is loading');
        }
    }
    
    collectPringle(pringle) {
        // Prevent multiple collections
        if (this.pringleCollected || this.levelCompleted) {
            return;
        }
        
        console.log('collectPringle function called!');
        
        // Mark as collected
        this.pringleCollected = true;
        
        // Add 1000 points
        this.points += 1000;
        if (this.updatePointsDisplay) {
            this.updatePointsDisplay();
        }
        console.log('Points updated to:', this.points);
        
        // Add 2 gold hearts
        this.goldHearts += 2;
        if (this.updateHeartsDisplay) {
            this.updateHeartsDisplay();
        }
        console.log('Gold hearts added! Total gold hearts:', this.goldHearts);
        
        // Mark level as completed and show victory screen
        this.levelCompleted = true;
        this.victoryKeyPressed = false; // Reset flag when level completes
        this.nKeyJustPressed = false; // Reset key flags
        this.rKeyJustPressed = false;
        
        // Stop player movement
        this.player.setVelocityX(0);
        this.player.setVelocityY(0);
        
        // Do a 360 rotation then show victory screen
        this.tweens.add({
            targets: pringle,
            rotation: pringle.rotation + Math.PI * 2, // 360 degrees in radians
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Make it disappear
                pringle.setVisible(false);
                pringle.setActive(false);
                if (pringle && pringle.destroy) {
                    pringle.destroy();
                }
                console.log('Pringle collected! Showing victory screen');
                
                // Store Level 1 points
                localStorage.setItem('level1Points', this.points.toString());
                
                // Show victory screen (same as reachFinish)
                const screenX = 400;
                const screenY = 300;
                
                const bgRect = this.add.rectangle(screenX, screenY, 600, 300, 0x000000, 0.7);
                bgRect.setScrollFactor(0, 0);
                bgRect.setDepth(9999);
                bgRect.setOrigin(0.5, 0.5);
                bgRect.setVisible(true);
                bgRect.setActive(true);
                
                const victoryText = this.add.text(
                    screenX,
                    screenY - 50,
                    'LEVEL COMPLETE!',
                    {
                        fontSize: '48px',
                        fill: '#00FF00',
                        fontFamily: 'Arial',
                        fontWeight: 'bold',
                        stroke: '#000000',
                        strokeThickness: 4
                    }
                );
                victoryText.setOrigin(0.5, 0.5);
                victoryText.setScrollFactor(0, 0);
                victoryText.setDepth(10000);
                victoryText.setVisible(true);
                victoryText.setActive(true);
                victoryText.setAlpha(1.0);
                
                const victoryPointsText = this.add.text(
                    screenX,
                    screenY + 20,
                    `Points: ${this.points}`,
                    {
                        fontSize: '32px',
                        fill: '#FFFFFF',
                        fontFamily: 'Arial',
                        fontWeight: 'bold',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                );
                victoryPointsText.setOrigin(0.5, 0.5);
                victoryPointsText.setScrollFactor(0, 0);
                victoryPointsText.setDepth(10000);
                victoryPointsText.setVisible(true);
                victoryPointsText.setActive(true);
                victoryPointsText.setAlpha(1.0);
                
                const nextLevelText = this.add.text(
                    screenX,
                    screenY + 70,
                    this.isMobile ? 'Tap screen for next level' : 'Press N for next level',
                    {
                        fontSize: '24px',
                        fill: '#00FF00',
                        fontFamily: 'Arial',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                );
                nextLevelText.setOrigin(0.5, 0.5);
                nextLevelText.setScrollFactor(0, 0);
                nextLevelText.setDepth(10000);
                nextLevelText.setVisible(true);
                nextLevelText.setActive(true);
                nextLevelText.setAlpha(1.0);
                
                const restartText = this.add.text(
                    screenX,
                    screenY + 110,
                    this.isMobile ? 'Tap to restart' : 'Press R to restart',
                    {
                        fontSize: '24px',
                        fill: '#00FF00',
                        fontFamily: 'Arial',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                );
                restartText.setOrigin(0.5, 0.5);
                restartText.setScrollFactor(0, 0);
                restartText.setDepth(10000);
                restartText.setVisible(true);
                restartText.setActive(true);
                restartText.setAlpha(1.0);
                
                this.victoryBgRect = bgRect;
                this.victoryText = victoryText;
                this.victoryPointsText = victoryPointsText;
                this.nextLevelText = nextLevelText;
                this.restartText = restartText;
                
                // On mobile: tap screen to go to next level
                if (this.isMobile) {
                    this.input.once('pointerdown', () => {
                        if (this.victoryKeyPressed) return;
                        this.victoryKeyPressed = true;
                        this.levelCompleted = false;
                        if (this.victoryBgRect) this.victoryBgRect.destroy();
                        if (this.victoryText) this.victoryText.destroy();
                        if (this.victoryPointsText) this.victoryPointsText.destroy();
                        if (this.nextLevelText) this.nextLevelText.destroy();
                        if (this.restartText) this.restartText.destroy();
                        this.time.delayedCall(50, () => {
                            this.scene.start('Level2Scene');
                        });
                    });
                }
                
                // Play victory sound if available
                if (this.victorySound) {
                    this.victorySound.play();
                }
            }
        });
    }
    
    createSecretCloud() {
        // Create a cloud platform at the left edge (off-screen, where camera stops)
        // Position it so player can jump to it from the starting area
        const cloudX = -150; // Further off-screen to the left
        const cloudY = 400; // Reachable height from starting platform
        
        // Create cloud as a white/light gray rounded rectangle
        const cloud = this.add.rectangle(cloudX, cloudY, 120, 30, 0xE0E0E0);
        this.physics.add.existing(cloud, true);
        cloud.setOrigin(0.5, 0.5);
        cloud.setStrokeStyle(2, 0xFFFFFF);
        
        // Add some cloud-like details (smaller rectangles for puffy effect)
        const cloudDetail1 = this.add.rectangle(cloudX - 30, cloudY - 10, 40, 25, 0xF0F0F0);
        cloudDetail1.setOrigin(0.5, 0.5);
        cloudDetail1.setDepth(1);
        
        const cloudDetail2 = this.add.rectangle(cloudX + 30, cloudY - 10, 40, 25, 0xF0F0F0);
        cloudDetail2.setOrigin(0.5, 0.5);
        cloudDetail2.setDepth(1);
        
        // Store cloud reference
        this.secretCloud = cloud;
        this.cloudDetails = [cloudDetail1, cloudDetail2];
        
        // Add to platforms group so player can land on it
        this.platforms.add(cloud);
        
        console.log('Secret cloud created at x:', cloudX, 'y:', cloudY);
    }
    
    landOnSecretCloud(player, cloud) {
        console.log('landOnSecretCloud called!', {
            teleporting: this.teleporting,
            touchingDown: player.body.touching.down,
            playerX: player.x,
            playerY: player.y
        });
        
        // Prevent multiple triggers
        if (this.teleporting) {
            console.log('Already teleporting, ignoring');
            return;
        }
        
        // Only trigger if player is landing from above (touching down)
        if (!player.body.touching.down) {
            console.log('Player not touching down, ignoring');
            return;
        }
        
        this.teleporting = true;
        console.log('Secret cloud activated!');
        
        // Stop player movement
        player.setVelocityX(0);
        player.setVelocityY(0);
        
        // Rotate stickman 360 degrees
        this.tweens.add({
            targets: player,
            angle: 360,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Reset rotation
                player.setAngle(0);
                
                // Teleport to second last platform
                if (this.secondLastPlatform) {
                    const targetX = this.secondLastPlatform.x;
                    // Get platform top position correctly
                    const platformTop = this.secondLastPlatform.y - (this.secondLastPlatform.height || 20) / 2;
                    const targetY = platformTop - 30; // Above platform
                    
                    console.log('About to teleport to:', { targetX, targetY, platformY: this.secondLastPlatform.y, platformHeight: this.secondLastPlatform.height });
                    
                    // Fade out
                    this.tweens.add({
                        targets: player,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => {
                            // Teleport
                            player.setPosition(targetX, targetY);
                            player.setAlpha(1);
                            
                            // Reset teleporting flag after a short delay
                            this.time.delayedCall(500, () => {
                                this.teleporting = false;
                            });
                            
                            console.log('Teleported to second last platform at x:', targetX, 'y:', targetY);
                        }
                    });
                } else {
                    console.warn('Second last platform not found! Cannot teleport.');
                    this.teleporting = false;
                }
            }
        });
    }
    
    createFinishFlag() {
        console.log('createFinishFlag() called!');
        // Use the stored last platform reference
        if (!this.lastPlatform) {
            console.error('ERROR: Last platform not found! Cannot create finish flag.');
            return;
        }
        console.log('Last platform found at x:', this.lastPlatform.x, 'y:', this.lastPlatform.y);
        
        const lastPlatform = this.lastPlatform;
        const platformX = lastPlatform.x;
        const platformY = lastPlatform.y;
        const platformWidth = lastPlatform.width;
        const platformHeight = lastPlatform.height;
        const platformTop = platformY - platformHeight / 2; // Top of platform
        
        // Place finish flag in the center of the last platform (where the spike would have been)
        const finishX = platformX; // Center of platform
        const poleBaseY = platformTop; // Pole base sits on platform top
        const poleHeight = 120;
        const poleTopY = poleBaseY - poleHeight; // Top of pole
        
        // Create finish flag pole (vertical rectangle) - make it thicker and more visible
        const pole = this.add.rectangle(finishX, poleBaseY - poleHeight/2, 12, poleHeight, 0x654321); // Brown pole, thicker
        this.physics.add.existing(pole, true); // Static body
        
        // Create checkered finish flag using a texture
        const flagWidth = 100;
        const flagHeight = 60;
        const checkerSize = 10;
        
        // Create checkered texture if it doesn't exist
        if (!this.textures.exists('checkeredFlag')) {
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
        }
        
        // Create flag sprite using the texture
        const flag = this.add.image(finishX + 6, poleTopY, 'checkeredFlag');
        flag.setOrigin(0, 0.5);
        
        // Create a finish zone covering the platform (semi-transparent for visibility)
        const finishZone = this.add.rectangle(finishX, platformY, platformWidth, 150, 0xFFD700, 0.3); // Gold, semi-transparent so you can see it
        this.physics.add.existing(finishZone, true);
        finishZone.setOrigin(0.5, 0.5);
        finishZone.setStrokeStyle(2, 0xFFD700); // Gold border
        
        // Make sure the physics body is set up correctly for overlap detection
        if (finishZone.body) {
            finishZone.body.setSize(platformWidth, 150);
            finishZone.body.setOffset(0, 0);
        }
        
        // Store finish zone reference
        this.finishZone = finishZone;
        
        // Add overlap detection for finish
        this.physics.add.overlap(this.player, finishZone, this.reachFinish, null, this);
        
        console.log('=== FINISH FLAG CREATED ===');
        console.log('Finish flag at x:', finishX, 'y:', platformY, 'platformWidth:', platformWidth);
        console.log('Finish zone at x:', finishZone.x, 'y:', finishZone.y);
        console.log('Finish zone size:', finishZone.width, 'x', finishZone.height);
        console.log('Finish zone body exists:', finishZone.body !== null);
        if (finishZone.body) {
            console.log('Finish zone body size:', finishZone.body.width, 'x', finishZone.body.height);
        }
    }
    
    reachFinish(player, finishZone) {
        // Prevent multiple triggers
        if (this.levelCompleted) {
            return;
        }
        
        this.levelCompleted = true;
        this.victoryKeyPressed = false; // Reset flag when level completes
        
        // Stop player movement FIRST
        this.player.setVelocityX(0);
        this.player.setVelocityY(0);
        
        // CREATE VICTORY SCREEN FIRST (before music code that might error)
        // Use fixed screen coordinates (game is 800x600)
        const screenX = 400; // Center X
        const screenY = 300; // Center Y
        
        // Create a semi-transparent background rectangle
        const bgRect = this.add.rectangle(screenX, screenY, 600, 300, 0x000000, 0.7);
        bgRect.setScrollFactor(0, 0);
        bgRect.setDepth(9999);
        bgRect.setOrigin(0.5, 0.5);
        bgRect.setVisible(true);
        bgRect.setActive(true);
        
        // Store Level 1 points
        localStorage.setItem('level1Points', this.points.toString());
        
        // Create victory message
        const victoryText = this.add.text(
            screenX,
            screenY - 50,
            'LEVEL COMPLETE!',
            {
                fontSize: '48px',
                fill: '#00FF00',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        victoryText.setOrigin(0.5, 0.5);
        victoryText.setScrollFactor(0, 0);
        victoryText.setDepth(10000);
        victoryText.setVisible(true);
        victoryText.setActive(true);
        victoryText.setAlpha(1.0);
        
        // Show points
        const victoryPointsText = this.add.text(
            screenX,
            screenY + 20,
            `Points: ${this.points}`,
            {
                fontSize: '32px',
                fill: '#FFFFFF',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        victoryPointsText.setOrigin(0.5, 0.5);
        victoryPointsText.setScrollFactor(0, 0);
        victoryPointsText.setDepth(10000);
        victoryPointsText.setVisible(true);
        victoryPointsText.setActive(true);
        victoryPointsText.setAlpha(1.0);
        
        // Show next level message (tap on mobile)
        const nextLevelText = this.add.text(
            screenX,
            screenY + 70,
            this.isMobile ? 'Tap screen for next level' : 'Press N for Next Level',
            {
                fontSize: '24px',
                fill: '#00FFFF',
                fontFamily: 'Arial',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        nextLevelText.setOrigin(0.5, 0.5);
        nextLevelText.setScrollFactor(0, 0);
        nextLevelText.setDepth(10000);
        nextLevelText.setVisible(true);
        nextLevelText.setActive(true);
        nextLevelText.setAlpha(1.0);
        
        // Show restart message (tap on mobile)
        const restartText = this.add.text(
            screenX,
            screenY + 110,
            this.isMobile ? 'Tap to restart' : 'Press R to restart',
            {
                fontSize: '24px',
                fill: '#FFFF00',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        restartText.setOrigin(0.5, 0.5);
        restartText.setScrollFactor(0, 0);
        restartText.setDepth(10000);
        restartText.setVisible(true);
        restartText.setActive(true);
        restartText.setAlpha(1.0);
        
        // Store text references
        this.victoryBgRect = bgRect;
        this.victoryText = victoryText;
        this.victoryPointsText = victoryPointsText;
        this.nextLevelText = nextLevelText;
        this.restartText = restartText;
        
        // On mobile: tap screen to go to next level (default) or restart
        if (this.isMobile) {
            this.input.once('pointerdown', () => {
                if (this.victoryKeyPressed) return;
                this.victoryKeyPressed = true;
                this.levelCompleted = false;
                if (this.victoryBgRect) this.victoryBgRect.destroy();
                if (this.victoryText) this.victoryText.destroy();
                if (this.victoryPointsText) this.victoryPointsText.destroy();
                if (this.nextLevelText) this.nextLevelText.destroy();
                if (this.restartText) this.restartText.destroy();
                this.time.delayedCall(50, () => {
                    this.scene.start('Level2Scene');
                });
            });
        }
        
        // Force render update
        this.children.bringToTop(bgRect);
        this.children.bringToTop(victoryText);
        this.children.bringToTop(victoryPointsText);
        this.children.bringToTop(nextLevelText);
        this.children.bringToTop(restartText);
        
        console.log('Victory screen created!');
        
        // NOW handle music (wrap in try-catch to prevent errors from blocking victory screen)
        try {
            // Stop background music temporarily while victory sound plays
            if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                this.backgroundMusic.pause();
            }
            
            // Play victory sound effect
            if (this.victorySound) {
                const victorySoundInstance = this.victorySound.play();
                
                if (victorySoundInstance) {
                    // Get the duration of the victory sound (in milliseconds)
                    const victoryDuration = victorySoundInstance.duration || 3000;
                    
                    // When victory sound finishes, resume background music
                    victorySoundInstance.once('complete', () => {
                        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                            this.backgroundMusic.resume();
                        }
                    });
                    
                    // Fallback: Use timer based on sound duration
                    this.time.delayedCall(victoryDuration, () => {
                        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                            this.backgroundMusic.resume();
                        }
                    });
                }
            } else {
                // If no victory sound, resume background music immediately
                if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.resume();
                }
            }
        } catch (error) {
            console.error('Error with victory music:', error);
            // Don't let music errors prevent victory screen from showing
        }
        
        // Keys are already created in setupControls(), just need to check them in update loop
    }

    checkPlatformCollection() {
        // Check which platform the player is currently standing on
        if (!this.player || !this.player.body.touching.down) {
            // Player is not on ground, clear current platform
            this.currentPlatform = null;
            return;
        }
        
        // Find which platform the player is touching
        const playerX = this.player.x;
        const playerBottom = this.player.y + this.player.body.height / 2;
        const playerLeft = this.player.x - this.player.body.width / 2;
        const playerRight = this.player.x + this.player.body.width / 2;
        
        // Check each platform to see if player is on it
        this.platforms.getChildren().forEach((platform) => {
            if (!platform || !platform.body) return;
            
            const platformLeft = platform.x - platform.width / 2;
            const platformRight = platform.x + platform.width / 2;
            const platformTop = platform.y - platform.body.height / 2;
            
            // Check if player is on top of this platform
            // Player must be horizontally within platform bounds
            // Player's bottom must be very close to platform's top (within 10 pixels)
            const isHorizontallyOnPlatform = playerRight > platformLeft && playerLeft < platformRight;
            const isOnTopOfPlatform = playerBottom >= platformTop - 10 && playerBottom <= platformTop + 5;
            const isOnPlatform = isHorizontallyOnPlatform && isOnTopOfPlatform;
            
            if (isOnPlatform && this.currentPlatform !== platform) {
                // Check if this is the starting platform (skip it - no points)
                const isStartingPlatform = (platform.x >= 140 && platform.x <= 200 && platform.y >= 440 && platform.y <= 460);
                
                // Track the current platform (even if it's the starting platform)
                this.currentPlatform = platform;
                
                // Skip awarding points for the starting platform
                if (isStartingPlatform) {
                    return; // Skip this platform, don't award points
                }
                
                // Player just landed on a new platform (not the starting platform)
                // Create unique key for this platform
                const platformKey = `platform_${Math.round(platform.x)}_${Math.round(platform.y)}`;
                
                // Check if this platform has already been collected
                if (!this.collectedPlatforms.has(platformKey)) {
                    this.collectedPlatforms.add(platformKey);
                    this.points += 10; // 10 points per platform
                    this.updatePointsDisplay();
                    console.log('Collected platform! Points:', this.points, 'Platform at:', platform.x, platform.y);
                }
                
            }
        });
    }

    createHeartsDisplay() {
        // Create hearts display in top right corner
        this.heartsGroup = this.add.group();
        this.updateHeartsDisplay();
    }

    updateHeartsDisplay() {
        // Clear existing hearts
        this.heartsGroup.clear(true, true);
        
        // Heart size and spacing
        const heartSize = 30;
        const heartSpacing = 35;
        const startX = 750; // Right side of screen
        const startY = 30; // Top of screen
        
        let heartIndex = 0;
        
        // Display gold hearts first
        for (let i = 0; i < this.goldHearts; i++) {
            const heartX = startX - heartIndex * heartSpacing;
            const heart = this.add.rectangle(heartX, startY, heartSize, heartSize, 0xFFD700); // Gold
            heart.setStrokeStyle(2, 0xFFFFFF); // White border
            heart.setScrollFactor(0); // Fixed to camera (stays in top right)
            this.heartsGroup.add(heart);
            heartIndex++;
        }
        
        // Display regular hearts
        const fullHearts = Math.floor(this.hearts);
        const hasHalfHeart = this.hearts % 1 !== 0;
        
        for (let i = 0; i < fullHearts; i++) {
            const heartX = startX - heartIndex * heartSpacing;
            const heart = this.add.rectangle(heartX, startY, heartSize, heartSize, 0xFF0000); // Red
            heart.setStrokeStyle(2, 0xFFFFFF); // White border
            heart.setScrollFactor(0); // Fixed to camera (stays in top right)
            this.heartsGroup.add(heart);
            heartIndex++;
        }
        
        // Display half heart if needed
        if (hasHalfHeart) {
            const heartX = startX - heartIndex * heartSpacing;
            // Create full heart outline
            const heart = this.add.rectangle(heartX, startY, heartSize, heartSize, 0x000000, 0); // Transparent
            heart.setStrokeStyle(2, 0xFFFFFF); // White border
            heart.setScrollFactor(0);
            this.heartsGroup.add(heart);
            
            // Add left half filled in red
            const halfHeart = this.add.rectangle(heartX - heartSize/4, startY, heartSize/2, heartSize, 0xFF0000); // Red left half
            halfHeart.setScrollFactor(0);
            this.heartsGroup.add(halfHeart);
            heartIndex++;
        }
    }

    createPointsDisplay() {
        // Create points display in top left, opposite side from hearts
        this.pointsText = this.add.text(50, 30, 'Points: 0', {
            fontSize: '24px',
            fill: '#FFFF00', // Yellow color
            fontFamily: 'Arial'
        });
        this.pointsText.setScrollFactor(0); // Fixed to camera
        this.pointsText.setDepth(1000); // Very high depth to stay on top
    }

    updatePointsDisplay() {
        // Update the points text
        if (this.pointsText) {
            this.pointsText.setText('Points: ' + this.points);
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


    createSpikeTexture() {
        // Create spike texture (triangle pointing up)
        if (!this.textures.exists('spike')) {
            const spikeWidth = 20;
            const spikeHeight = 15;
            
            // Create graphics object for drawing
            const graphics = this.add.graphics();
            
            // Clear any previous drawing
            graphics.clear();
            
            // Set fill style - pure black
            graphics.fillStyle(0x000000); // Pure black
            
            // Draw triangle pointing up using fillTriangle
            // Coordinates are absolute within the texture bounds (0,0 to width,height)
            graphics.fillTriangle(
                0, spikeHeight,              // Bottom left (x: 0, y: bottom)
                spikeWidth / 2, 0,          // Top center (x: center, y: top)
                spikeWidth, spikeHeight     // Bottom right (x: right, y: bottom)
            );
            
            // Generate texture with exact dimensions
            graphics.generateTexture('spike', spikeWidth, spikeHeight);
            
            // Clean up graphics object
            graphics.destroy();
            
            console.log('Spike texture created, exists:', this.textures.exists('spike'));
        } else {
            console.log('Spike texture already exists');
        }
    }

    addSpikesToPlatform(platform) {
        // Add spikes to a platform (1-3 spikes randomly placed)
        const platformHeight = 20;
        const spikeWidth = 20;
        const spikeHeight = 15;
        const topY = platform.y - platformHeight / 2; // Top of platform
        
        // Use seeded random based on platform position for consistency
        let seed = Math.floor(platform.x * 100 + platform.y);
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        const randomBetween = (min, max) => seededRandom() * (max - min) + min;
        
        // Number of spikes (1-3)
        const numSpikes = Math.floor(seededRandom() * 3) + 1;
        console.log('Creating', numSpikes, 'spikes on platform at x:', platform.x);
        
        // Place spikes along the platform (avoid edges)
        const platformLeft = platform.x - platform.width / 2;
        const platformRight = platform.x + platform.width / 2;
        const edgeBuffer = 30; // Don't place spikes too close to edges
        
        for (let i = 0; i < numSpikes; i++) {
            // Random position along platform
            const spikeX = randomBetween(platformLeft + edgeBuffer, platformRight - edgeBuffer);
            const spikeY = topY - spikeHeight / 2; // Position on top of platform
            
            // Ensure texture is ready before creating spike
            if (!this.textures.exists('spike')) {
                this.createSpikeTexture();
            }
            
            // Create spike sprite using static group's create method
            const spike = this.spikes.create(spikeX, spikeY, 'spike');
            
            // Verify texture exists and is valid, and force refresh if needed
            if (!spike.texture || spike.texture.key !== 'spike') {
                console.error('Spike texture issue at x:', spikeX, 'texture key:', spike.texture?.key);
                // Try to fix by explicitly setting the texture
                if (this.textures.exists('spike')) {
                    spike.setTexture('spike');
                }
            } else {
                // Even if texture is correct, explicitly refresh it to ensure it displays
                spike.setTexture('spike');
            }
            
            spike.setOrigin(0.5, 1); // Anchor at bottom center so it sits on platform
            // Don't set display size - use texture's natural size
            spike.setScale(1, 1); // Ensure no scaling
            spike.setVisible(true);
            spike.setActive(true);
            spike.setDepth(10); // Higher depth to ensure spikes render above grass
            
            // Debug: log spike dimensions
            if (i === 0) { // Only log first spike to avoid spam
                console.log('Spike created - width:', spike.width, 'height:', spike.height, 'texture key:', spike.texture?.key);
            }
            
            // Make hitbox extremely small and tight - only the very tip of the spike
            // Much smaller than before - player must actually touch the point
            const hitboxWidth = 4; // Extremely small - just the very tip (spike is 20 wide)
            const hitboxHeight = 4; // Extremely small - just the very top (spike is 15 tall)
            spike.body.setSize(hitboxWidth, hitboxHeight);
            // Offset upward and center so hitbox is at the absolute top pointy tip
            spike.body.setOffset((spikeWidth - hitboxWidth) / 2, -spikeHeight + hitboxHeight / 2);
            
            console.log('Created spike at x:', spikeX, 'y:', spikeY, 'visible:', spike.visible);
        }
    }

    hitSpike(player, spike) {
        // Check if player is invincible - if so, ignore damage
        if (this.isInvincible) {
            return; // Player is invincible, no damage
        }
        
        // Only trigger if player is actually touching the spike from above
        // Check if player's bottom is touching spike's top (more precise collision)
        const playerBottom = player.y + player.body.height / 2;
        const spikeTop = spike.y - spike.body.height / 2;
        
        // Only hurt if player is falling onto the spike (from above)
        // Player must be above or at the spike level, and moving down or touching
        if (playerBottom > spikeTop - 3 && player.body.velocity.y >= 0) {
            // Player hit a spike - lose a heart (with cooldown to prevent rapid hits)
            const currentTime = this.time.now;
            if (currentTime - this.lastSpikeHitTime < this.spikeHitCooldown) {
                return; // Still in cooldown, ignore this hit
            }
            
            this.lastSpikeHitTime = currentTime;
            
            if (this.hearts > 0) {
                this.hearts--;
                this.updateHeartsDisplay();
                console.log('Hit spike! Hearts remaining:', this.hearts);
                
                // Play hit sound effect
                if (this.hitSound) {
                    this.hitSound.play();
                }
                
                // Activate invincibility for 3 seconds
                this.isInvincible = true;
                this.time.delayedCall(this.invincibilityDuration, () => {
                    this.isInvincible = false;
                    console.log('Invincibility ended');
                });
                
                // If no hearts left, restart level
                if (this.hearts <= 0) {
                    console.log('No hearts left! Restarting level...');
                    this.stopMusicBeforeRestart();
                    this.time.delayedCall(500, () => {
                        this.scene.restart();
                    });
                }
            }
        }
    }

    restartLevel() {
        // Restart the level by restarting the scene
        console.log('Restarting level...');
        this.stopMusicBeforeRestart();
        this.scene.restart();
    }

    addGrass(centerX, topY, width) {
        // Add a continuous green grass line along the top of a platform
        const grassColor = 0x00AA00; // Green color
        const grassHeight = 8; // Height of grass (increased from 4 to 8)
        
        // Create one continuous rectangle for the entire width
        // Position it at the top edge of the platform
        const grassY = topY - grassHeight / 2; // Center the grass on the top edge
        
        // Create a single continuous green rectangle
        const grass = this.add.rectangle(centerX, grassY, width, grassHeight, grassColor);
        grass.setDepth(1); // Low depth so spikes render on top
    }

    createTurtleTexture() {
        // Create turtle texture
        if (!this.textures.exists('turtle')) {
            const turtleWidth = 45;
            const turtleHeight = 35;
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = turtleWidth / 2;
            const centerY = turtleHeight / 2;
            
            // Turtle shell - large, domed, green color
            graphics.fillStyle(0x228B22); // Forest green for shell
            const shellCenterX = centerX;
            const shellCenterY = centerY + 2;
            const shellWidth = 36;
            const shellHeight = 24;
            // Draw a more domed shell (taller ellipse)
            graphics.fillEllipse(shellCenterX, shellCenterY, shellWidth, shellHeight);
            
            // Shell pattern - hexagonal/segmented pattern
            graphics.fillStyle(0x006400); // Darker green for pattern
            // Draw some hexagonal segments on the shell
            const patternSize = 4;
            // Top row
            graphics.fillCircle(shellCenterX - 8, shellCenterY - 4, patternSize);
            graphics.fillCircle(shellCenterX, shellCenterY - 6, patternSize);
            graphics.fillCircle(shellCenterX + 8, shellCenterY - 4, patternSize);
            // Middle row
            graphics.fillCircle(shellCenterX - 6, shellCenterY, patternSize);
            graphics.fillCircle(shellCenterX + 6, shellCenterY, patternSize);
            // Bottom row
            graphics.fillCircle(shellCenterX - 4, shellCenterY + 4, patternSize);
            graphics.fillCircle(shellCenterX + 4, shellCenterY + 4, patternSize);
            
            // Turtle head - smaller, more turtle-like (brown/green)
            graphics.fillStyle(0x556B2F); // Dark olive green for head
            const headX = shellCenterX;
            const headY = shellCenterY - shellHeight / 2 - 2;
            const headWidth = 8;
            const headHeight = 6;
            // Draw head as an ellipse (more turtle-like, rounded)
            graphics.fillEllipse(headX, headY, headWidth, headHeight);
            
            // Turtle eyes - on the sides of the head
            graphics.fillStyle(0x000000); // Black
            graphics.fillCircle(headX - 3, headY - 1, 1.5); // Left eye
            graphics.fillCircle(headX + 3, headY - 1, 1.5); // Right eye
            
            // Turtle legs - shorter and stubby (four legs)
            graphics.fillStyle(0x556B2F); // Dark olive green for legs
            const legWidth = 5;
            const legHeight = 4; // Shorter legs (more turtle-like)
            // Front left leg
            graphics.fillRect(shellCenterX - shellWidth / 2 + 1, shellCenterY + shellHeight / 2 - 2, legWidth, legHeight);
            // Front right leg
            graphics.fillRect(shellCenterX + shellWidth / 2 - 6, shellCenterY + shellHeight / 2 - 2, legWidth, legHeight);
            // Back left leg
            graphics.fillRect(shellCenterX - shellWidth / 2 + 3, shellCenterY - shellHeight / 2 + 4, legWidth, legHeight);
            // Back right leg
            graphics.fillRect(shellCenterX + shellWidth / 2 - 8, shellCenterY - shellHeight / 2 + 4, legWidth, legHeight);
            
            // Turtle tail - small triangle at the back
            graphics.fillStyle(0x556B2F); // Dark olive green for tail
            const tailX = shellCenterX;
            const tailY = shellCenterY + shellHeight / 2 + 2;
            graphics.fillTriangle(
                tailX, tailY,
                tailX - 3, tailY + 4,
                tailX + 3, tailY + 4
            );
            
            // Generate texture
            graphics.generateTexture('turtle', turtleWidth, turtleHeight);
            graphics.destroy();
            
            console.log('Turtle texture created');
        }
    }

    createPancakeTexture() {
        // Create pancake texture (circular, golden brown)
        if (!this.textures.exists('pancake')) {
            const pancakeSize = 20;
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            // Main pancake circle - golden brown
            graphics.fillStyle(0xD2691E); // Chocolate/caramel color
            graphics.fillCircle(pancakeSize / 2, pancakeSize / 2, pancakeSize / 2 - 1);
            
            // Add some texture - small circles for bubbles/holes
            graphics.fillStyle(0xB8860B); // Darker golden
            graphics.fillCircle(pancakeSize / 2 - 3, pancakeSize / 2 - 2, 2);
            graphics.fillCircle(pancakeSize / 2 + 3, pancakeSize / 2 + 2, 2);
            graphics.fillCircle(pancakeSize / 2, pancakeSize / 2 + 1, 1.5);
            
            // Generate texture
            graphics.generateTexture('pancake', pancakeSize, pancakeSize);
            graphics.destroy();
            
            console.log('Pancake texture created');
        }
    }

    createEnemies() {
        // Create group for enemies
        this.enemies = this.physics.add.group();
        
        // Create group for pancakes (projectiles)
        this.pancakes = this.physics.add.group();
        
        // Helper function to check if a platform has spikes
        const platformHasSpikes = (platform) => {
            if (!this.spikes) return false;
            const platformLeft = platform.x - platform.width / 2;
            const platformRight = platform.x + platform.width / 2;
            const platformTop = platform.y - platform.body.height / 2;
            
            // Check if any spikes are on this platform
            let hasSpikes = false;
            this.spikes.getChildren().forEach((spike) => {
                if (spike && spike.active) {
                    const spikeX = spike.x;
                    const spikeY = spike.y;
                    // Check if spike is on this platform (within platform bounds and on top)
                    if (spikeX >= platformLeft && spikeX <= platformRight && 
                        Math.abs(spikeY - platformTop) < 20) {
                        hasSpikes = true;
                    }
                }
            });
            return hasSpikes;
        };
        
        // Find suitable platforms for enemies (not the starting platform, no spikes)
        const enemyPlatforms = [];
        this.platforms.getChildren().forEach((platform, index) => {
            const isStartingPlatform = (platform.x >= 140 && platform.x <= 200 && platform.y >= 440 && platform.y <= 460);
            if (!isStartingPlatform && platform.x > 300 && platform.x < 3500 && !platformHasSpikes(platform)) {
                enemyPlatforms.push(platform);
            }
        });
        
        // Place 2 enemies on different platforms - spread them out more
        if (enemyPlatforms.length >= 2) {
            // Sort platforms by x position
            const sortedPlatforms = [...enemyPlatforms].sort((a, b) => a.x - b.x);
            
            // First enemy - place on a platform in the first third of the level
            const firstThirdIndex = Math.floor(sortedPlatforms.length * 0.15); // 15% into the level
            const firstEnemyPlatform = sortedPlatforms[firstThirdIndex] || sortedPlatforms[0];
            if (firstEnemyPlatform) {
                this.createEnemy(firstEnemyPlatform.x, firstEnemyPlatform.y - firstEnemyPlatform.body.height / 2 - 15);
                console.log('First enemy created at platform x:', firstEnemyPlatform.x, 'y:', firstEnemyPlatform.y);
            }
            
            // Second enemy - place on the last platform (furthest right)
            const lastPlatform = sortedPlatforms[sortedPlatforms.length - 1];
            if (lastPlatform && lastPlatform !== firstEnemyPlatform) {
                this.createEnemy(lastPlatform.x, lastPlatform.y - lastPlatform.body.height / 2 - 15);
                console.log('Second enemy created at platform x:', lastPlatform.x, 'y:', lastPlatform.y);
            } else if (sortedPlatforms.length >= 2) {
                // Fallback: use second-to-last if last is same as first
                const secondToLastPlatform = sortedPlatforms[sortedPlatforms.length - 2];
                if (secondToLastPlatform && secondToLastPlatform !== firstEnemyPlatform) {
                    this.createEnemy(secondToLastPlatform.x, secondToLastPlatform.y - secondToLastPlatform.body.height / 2 - 15);
                    console.log('Second enemy created at platform x:', secondToLastPlatform.x, 'y:', secondToLastPlatform.y);
                }
            }
        } else if (enemyPlatforms.length >= 1) {
            // If not enough platforms, place both on available ones
            this.createEnemy(enemyPlatforms[0].x, enemyPlatforms[0].y - enemyPlatforms[0].body.height / 2 - 15);
            if (enemyPlatforms.length > 1) {
                this.createEnemy(enemyPlatforms[1].x, enemyPlatforms[1].y - enemyPlatforms[1].body.height / 2 - 15);
            }
        }
        
        // Make enemies collide with platforms
        this.physics.add.collider(this.enemies, this.platforms);
        
        // Make pancakes collide with platforms (they should bounce or stop)
        this.physics.add.collider(this.pancakes, this.platforms, (pancake, platform) => {
            // Remove pancake when it hits a platform
            if (pancake && pancake.active) {
                pancake.destroy();
            }
        });
        
        // Make pancakes overlap with player (to detect hits)
        this.physics.add.overlap(this.player, this.pancakes, this.hitPancake, null, this);
    }

    createEnemy(x, y) {
        // Create a turtle enemy
        const enemy = this.physics.add.sprite(x, y, 'turtle');
        enemy.setOrigin(0.5, 1); // Anchor at bottom center
        enemy.setCollideWorldBounds(false);
        
        // Enemy properties
        enemy.lastThrowTime = 0;
        enemy.throwCooldown = 2000; // Throw every 2 seconds
        enemy.throwRange = 600; // Maximum distance to throw at player
        enemy.lastJumpTime = 0;
        enemy.jumpCooldown = 5000; // Jump every 5 seconds
        enemy.jumpSpeed = -700; // Jump velocity (negative = up) - increased for higher jumps
        enemy.moveSpeed = 150; // Movement speed when jumping around - increased for longer jumps
        enemy.currentPlatform = null; // Track which platform enemy is on
        
        // Add to enemies group
        this.enemies.add(enemy);
        
        console.log('Enemy created at x:', x, 'y:', y);
    }

    throwPancake(enemy) {
        // Create a pancake projectile - spawn it above the enemy
        const spawnY = enemy.y - 25; // Higher up from enemy
        const pancake = this.physics.add.sprite(enemy.x, spawnY, 'pancake');
        pancake.setOrigin(0.5, 0.5);
        
        // Enable gravity for pancake
        pancake.body.setGravityY(800); // Same gravity as world
        
        // Make sure pancake is active and visible
        pancake.setActive(true);
        pancake.setVisible(true);
        
        // Add to pancakes group FIRST before setting velocity
        this.pancakes.add(pancake);
        
        // Calculate direction to player
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Set pancake velocity (throw speed) - add some upward arc for trajectory
        const throwSpeed = 350;
        const upwardArc = -200; // Upward arc for better trajectory
        pancake.setVelocity(dirX * throwSpeed, dirY * throwSpeed + upwardArc);
        
        // Remove pancake after 5 seconds if it doesn't hit anything
        this.time.delayedCall(5000, () => {
            if (pancake && pancake.active) {
                pancake.destroy();
            }
        });
        
        console.log('Enemy threw a pancake! Position:', enemy.x, spawnY, 'Velocity:', dirX * throwSpeed, dirY * throwSpeed + upwardArc);
    }

    hitPancake(player, pancake) {
        // Check if player is invincible
        if (this.isInvincible) {
            pancake.destroy();
            return;
        }
        
        // Player hit by pancake - lose a heart
        const currentTime = this.time.now;
        if (currentTime - this.lastSpikeHitTime < this.spikeHitCooldown) {
            pancake.destroy();
            return; // Still in cooldown
        }
        
        this.lastSpikeHitTime = currentTime;
        
        if (this.hearts > 0) {
            this.hearts--;
            this.updateHeartsDisplay();
            console.log('Hit by pancake! Hearts remaining:', this.hearts);
            
            // Play hit sound effect
            if (this.hitSound) {
                this.hitSound.play();
            }
            
            // Activate invincibility
            this.isInvincible = true;
            this.time.delayedCall(this.invincibilityDuration, () => {
                this.isInvincible = false;
                console.log('Invincibility ended');
            });
            
            // If no hearts left, restart level
            if (this.hearts <= 0) {
                console.log('No hearts left! Restarting level...');
                this.time.delayedCall(500, () => {
                    this.scene.restart();
                });
            }
        }
        
        // Remove the pancake
        pancake.destroy();
    }

    update() {
        // This function runs every frame (60 times per second)
        
        // If level is completed, check for victory screen keys
        if (this.levelCompleted && !this.victoryKeyPressed) {
            // Check for next level key (N) - use justPressed to avoid repeat triggers
            if (this.nKey && this.nKey.isDown && !this.nKeyJustPressed) {
                console.log('N key pressed - transitioning to Level 2');
                this.nKeyJustPressed = true;
                this.victoryKeyPressed = true;
                this.levelCompleted = false;
                
                // Clean up victory screen
                if (this.victoryBgRect) this.victoryBgRect.destroy();
                if (this.victoryText) this.victoryText.destroy();
                if (this.victoryPointsText) this.victoryPointsText.destroy();
                if (this.nextLevelText) this.nextLevelText.destroy();
                if (this.restartText) this.restartText.destroy();
                
                // Small delay to ensure cleanup completes, then transition
                this.time.delayedCall(50, () => {
                    console.log('Starting Level2Scene...');
                    this.scene.start('Level2Scene');
                    console.log('Scene.start() called');
                });
                return;
            } else if (this.nKey && !this.nKey.isDown && this.nKeyJustPressed) {
                this.nKeyJustPressed = false;
            }
            
            // Check for restart key (R) - use justPressed to avoid repeat triggers
            if (this.rKey && this.rKey.isDown && !this.rKeyJustPressed) {
                console.log('R key pressed - restarting level');
                this.rKeyJustPressed = true;
                this.victoryKeyPressed = true;
                this.levelCompleted = false;
                if (this.victoryBgRect) this.victoryBgRect.destroy();
                if (this.victoryText) this.victoryText.destroy();
                if (this.victoryPointsText) this.victoryPointsText.destroy();
                if (this.nextLevelText) this.nextLevelText.destroy();
                if (this.restartText) this.restartText.destroy();
                this.stopMusicBeforeRestart();
                this.scene.restart();
                return;
            } else if (this.rKey && !this.rKey.isDown && this.rKeyJustPressed) {
                this.rKeyJustPressed = false;
            }
        }
        
        // Manual check for finish zone overlap (in case overlap callback isn't working)
        // Debug: Check if finish zone exists
        if (!this.finishZone && this.time.now % 3000 < 16) {
            console.log('WARNING: finishZone is null!');
        }
        
        if (this.finishZone && this.player && !this.levelCompleted) {
            // Use body bounds if available, otherwise use rectangle bounds
            let zoneLeft, zoneRight, zoneTop, zoneBottom;
            
            if (this.finishZone.body) {
                zoneLeft = this.finishZone.body.x;
                zoneRight = this.finishZone.body.x + this.finishZone.body.width;
                zoneTop = this.finishZone.body.y;
                zoneBottom = this.finishZone.body.y + this.finishZone.body.height;
            } else {
                zoneLeft = this.finishZone.x - this.finishZone.width / 2;
                zoneRight = this.finishZone.x + this.finishZone.width / 2;
                zoneTop = this.finishZone.y - this.finishZone.height / 2;
                zoneBottom = this.finishZone.y + this.finishZone.height / 2;
            }
            
            const playerLeft = this.player.x - this.player.body.width / 2;
            const playerRight = this.player.x + this.player.body.width / 2;
            const playerTop = this.player.y - this.player.body.height / 2;
            const playerBottom = this.player.y + this.player.body.height / 2;
            
            // Check if player overlaps with finish zone
            const playerInZone = !(playerRight < zoneLeft || playerLeft > zoneRight || 
                                  playerBottom < zoneTop || playerTop > zoneBottom);
            
            // Debug every 60 frames (once per second at 60fps)
            if (this.time.now % 1000 < 16) {
                console.log('Finish zone check:', {
                    playerX: this.player.x.toFixed(1),
                    playerY: this.player.y.toFixed(1),
                    zoneX: this.finishZone.x.toFixed(1),
                    zoneY: this.finishZone.y.toFixed(1),
                    playerInZone: playerInZone
                });
            }
            
            if (playerInZone) {
                console.log('=== MANUAL FINISH DETECTION ===');
                console.log('Player in finish zone! Calling reachFinish...');
                this.reachFinish(this.player, this.finishZone);
            }
        }
        
        // Allow camera to follow left if player goes far enough left (past visible area)
        if (this.player) {
            if (this.player.x < -50) {
                // Player has gone left past the visible area, allow camera to follow
                if (!this.cameraFollowLeft) {
                    this.cameraFollowLeft = true;
                    console.log('Camera now following left - secret cloud area unlocked!');
                }
            }
            
            // If camera shouldn't follow left yet, lock it to x=0
            if (!this.cameraFollowLeft) {
                if (this.cameras.main.scrollX < 0) {
                    this.cameras.main.setScroll(0, this.cameras.main.scrollY);
                }
            }
            
            // Manual check for cloud landing (fallback if overlap doesn't work)
            if (this.secretCloud && !this.teleporting && this.player.body.touching.down) {
                const cloudLeft = this.secretCloud.x - this.secretCloud.width / 2;
                const cloudRight = this.secretCloud.x + this.secretCloud.width / 2;
                const cloudTop = this.secretCloud.y - this.secretCloud.height / 2;
                const cloudBottom = this.secretCloud.y + this.secretCloud.height / 2;
                
                const playerLeft = this.player.x - this.player.body.width / 2;
                const playerRight = this.player.x + this.player.body.width / 2;
                const playerBottom = this.player.y + this.player.body.height / 2;
                
                // Check if player is on top of cloud
                if (playerRight > cloudLeft && playerLeft < cloudRight && 
                    playerBottom >= cloudTop - 5 && playerBottom <= cloudTop + 10) {
                    // Player is on cloud, trigger teleport
                    this.landOnSecretCloud(this.player, this.secretCloud);
                }
            }
        }
        
        // Safety check: Stop any duplicate background music instances (keep only one)
        if (this.game && this.game.sound && this.game.sound.sounds) {
            const bgMusicSounds = this.game.sound.sounds.filter(s => s && s.key === 'backgroundMusic');
            if (bgMusicSounds.length > 1) {
                // Multiple music instances found - keep the one that's playing, or the first one
                let keepSound = bgMusicSounds.find(s => s.isPlaying) || bgMusicSounds[0];
                console.log(`WARNING: ${bgMusicSounds.length} music instances detected, destroying extras`);
                for (let sound of bgMusicSounds) {
                    if (sound !== keepSound) {
                        try {
                            sound.stop();
                            sound.destroy();
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                }
                // Update our reference to the kept sound
                if (keepSound && (!this.backgroundMusic || this.backgroundMusic !== keepSound)) {
                    this.backgroundMusic = keepSound;
                    globalBackgroundMusic = keepSound;
                    if (keepSound.isPlaying) {
                        this.musicStarted = true;
                    }
                }
            }
        }
        
        // FIRST: Check if player has fallen - restart immediately if so
        // Exception: Allow player to go down to Pringle area (x: 80-220, y: up to 860)
        if (this.player && this.player.y > 580) {
            // Check if player is in the Pringle area (around x: 150, platform width 140)
            const pringleAreaXMin = 80;
            const pringleAreaXMax = 220;
            const pringleAreaYMax = 860; // Allow going down to collect Pringle (platform at y: 780)
            
            const isInPringleArea = this.player.x >= pringleAreaXMin && 
                                   this.player.x <= pringleAreaXMax && 
                                   this.player.y <= pringleAreaYMax;
            
            if (!isInPringleArea) {
                console.log('RESTART TRIGGERED: Player Y =', this.player.y);
                this.stopMusicBeforeRestart();
                this.scene.restart();
                return;
            }
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
        
        // Check if player is on Pringle platform and handle teleportation
        if (this.pringlePlatform && this.player && !this.levelCompleted) {
            // Simple position-based check - more reliable
            const pringlePlatformX = 150;
            const pringlePlatformY = 780;
            const pringlePlatformWidth = 140;
            
            // Check if player is horizontally aligned with platform and standing on it
            const playerX = this.player.x;
            const playerY = this.player.y;
            const platformLeft = pringlePlatformX - pringlePlatformWidth / 2;
            const platformRight = pringlePlatformX + pringlePlatformWidth / 2;
            const platformTop = pringlePlatformY - 10; // Top of platform (platform center - half height)
            
            // Player is on platform if: horizontally aligned, touching down, and near platform top
            const isHorizontallyAligned = playerX >= platformLeft && playerX <= platformRight;
            const isOnTop = this.player.body.touching.down && playerY >= platformTop - 5 && playerY <= platformTop + 15;
            const isOnPlatform = isHorizontallyAligned && isOnTop;
            
            // Debug logging
            if (isHorizontallyAligned && !this.onPringlePlatform) {
                console.log('Player near Pringle platform. X:', playerX.toFixed(1), 'Y:', playerY.toFixed(1), 
                          'Touching down:', this.player.body.touching.down, 'Platform top:', platformTop);
            }
            
            if (isOnPlatform) {
                if (!this.onPringlePlatform) {
                    // Just landed on platform, record landing time
                    this.onPringlePlatform = true;
                    this.pringlePlatformLandTime = this.time.now;
                    console.log('Player landed on Pringle platform, teleportation timer started');
                } else {
                    // Still on platform, check if 3 seconds have passed
                    const timeOnPlatform = this.time.now - this.pringlePlatformLandTime;
                    if (timeOnPlatform >= this.pringlePlatformTeleportDelay) {
                        // Teleport player to starting platform
                        this.player.x = 100; // Starting X position
                        this.player.y = 400; // Starting Y position (above the starting platform)
                        this.player.setVelocityX(0);
                        this.player.setVelocityY(0);
                        
                        // Reset flag
                        this.onPringlePlatform = false;
                        this.pringlePlatformLandTime = 0;
                        
                        console.log('Player teleported to starting platform!');
                    }
                }
            } else {
                // Not on platform, reset timer
                if (this.onPringlePlatform) {
                    this.onPringlePlatform = false;
                    this.pringlePlatformLandTime = 0;
                }
            }
        }
        
        // Handle left/right movement
        let isMoving = false;
        
        // Check if left arrow, A key, or mobile left button is pressed
        if (this.cursors.left.isDown || this.wasd.A.isDown || this.mobileLeft) {
            // Move left (negative velocity)
            this.player.setVelocityX(-this.playerSpeed);
            isMoving = true;
            this.facingDirection = -1; // Facing left
            this.player.setFlipX(true); // Flip sprite to face left
            
            // Update eye position for left-facing
            // We need to recreate the texture with eye on the left side
            // For now, flipping will flip the whole sprite including the eye
        }
        // Check if right arrow, D key, or mobile right button is pressed
        else if (this.cursors.right.isDown || this.wasd.D.isDown || this.mobileRight) {
            // Move right (positive velocity)
            this.player.setVelocityX(this.playerSpeed);
            isMoving = true;
            this.facingDirection = 1; // Facing right
            this.player.setFlipX(false); // Don't flip sprite (face right)
        }
        // If no keys are pressed, the drag will slow the player down
        // (we set drag in createStickman, so it will automatically stop)
        
        // Handle jumping
        // Check if player is on the ground (touching something below)
        const isOnGround = this.player.body.touching.down;
        const isMovingUp = this.player.body.velocity.y < 0; // Moving upward
        const isMovingDown = this.player.body.velocity.y > 0; // Moving downward
        
        // Jump if spacebar, up arrow, W, or mobile jump button is pressed AND player is on ground
        if ((this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown || this.mobileJump) && isOnGround) {
            // Apply upward velocity (negative Y = up)
            this.player.setVelocityY(this.jumpSpeed);
        }
        
        // Start background music on first player movement (only once, never stop it)
        if (!this.musicStarted && this.backgroundMusic && !this.backgroundMusic.isPlaying && (isMoving || (this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown || this.mobileJump))) {
            try {
                this.backgroundMusic.play();
                this.musicStarted = true;
                globalBackgroundMusic = this.backgroundMusic;
                backgroundMusicInitialized = true;
                console.log('✓ Background music started on first player movement!');
            } catch (error) {
                console.log('Could not start music:', error);
            }
        }
        
        // Safety: If music is playing but flag says it's not started, update the flag
        if (this.backgroundMusic && this.backgroundMusic.isPlaying && !this.musicStarted) {
            this.musicStarted = true;
        }
        
        // Check for platform collection (award points when landing on new platforms)
        this.checkPlatformCollection();
        
        // Update progress bar (only if level not completed)
        // DISABLED - causing issues
        // if (!this.levelCompleted) {
        //     try {
        //         this.updateProgressBar();
        //     } catch (error) {
        //         console.error('Error updating progress bar:', error);
        //         // Don't let progress bar errors break the game
        //     }
        // }
        
        // Update enemy AI (throw pancakes at player)
        this.updateEnemies();
        
        // Update animation based on player state
        this.updateAnimation(isOnGround, isMoving, isMovingUp, isMovingDown);
    }

    updateEnemies() {
        // Update each enemy's behavior
        if (!this.enemies || !this.player) return;
        
        const currentTime = this.time.now;
        
        this.enemies.getChildren().forEach((enemy) => {
            if (!enemy || !enemy.active) return;
            
            // Calculate distance to player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Face the player
            if (dx > 0) {
                enemy.setFlipX(false); // Face right
            } else {
                enemy.setFlipX(true); // Face left
            }
            
            // Make enemies jump toward player's platform (but not on same platform)
            const isOnGround = enemy.body.touching.down;
            const timeSinceLastJump = currentTime - enemy.lastJumpTime;
            const canJump = timeSinceLastJump >= enemy.jumpCooldown;
            
            // Debug: Log jump conditions
            if (currentTime % 1000 < 50) { // Log every second
                console.log('Enemy jump check - OnGround:', isOnGround, 'CanJump:', canJump, 'TimeSinceJump:', timeSinceLastJump, 'Cooldown:', enemy.jumpCooldown);
            }
            
            if (isOnGround && canJump) {
                const enemyX = enemy.x;
                const enemyY = enemy.y;
                const playerX = this.player.x;
                const playerY = this.player.y;
                
                // Find which platform the enemy is currently on
                let enemyPlatform = null;
                this.platforms.getChildren().forEach((platform) => {
                    if (!platform || !platform.body) return;
                    
                    const platformLeft = platform.x - platform.width / 2;
                    const platformRight = platform.x + platform.width / 2;
                    const platformTop = platform.y - platform.body.height / 2;
                    
                    const isHorizontallyOnPlatform = enemyX >= platformLeft - 10 && enemyX <= platformRight + 10;
                    const isNearPlatformTop = enemyY >= platformTop - 5 && enemyY <= platformTop + 25;
                    
                    if (isHorizontallyOnPlatform && isNearPlatformTop) {
                        enemyPlatform = platform;
                    }
                });
                
                // Find which platform the player is on
                let playerPlatform = null;
                this.platforms.getChildren().forEach((platform) => {
                    if (!platform || !platform.body) return;
                    
                    const platformLeft = platform.x - platform.width / 2;
                    const platformRight = platform.x + platform.width / 2;
                    const platformTop = platform.y - platform.body.height / 2;
                    const playerBottom = playerY + this.player.body.height / 2;
                    
                    const isHorizontallyOnPlatform = playerX >= platformLeft && playerX <= platformRight;
                    const isOnTopOfPlatform = playerBottom >= platformTop - 10 && playerBottom <= platformTop + 5;
                    
                    if (isHorizontallyOnPlatform && isOnTopOfPlatform) {
                        playerPlatform = platform;
                    }
                });
                
                console.log('Enemy jump attempt - Enemy on platform:', enemyPlatform ? enemyPlatform.x : 'none', 'Player on platform:', playerPlatform ? playerPlatform.x : 'none');
                
                // Check if enemy and player are on the same platform
                const onSamePlatform = enemyPlatform === playerPlatform && enemyPlatform !== null;
                
                // Find platforms to jump to
                const maxJumpDistance = 550; // Maximum horizontal jump distance (increased)
                const maxVerticalDistance = 450; // Maximum vertical distance (increased for higher jumps)
                const candidatePlatforms = [];
                
                this.platforms.getChildren().forEach((platform) => {
                    if (!platform || !platform.body || platform === enemyPlatform) return;
                    
                    // If on same platform as player, skip player's platform
                    if (onSamePlatform && platform === playerPlatform) return;
                    
                    // If not on same platform, skip player's platform (we want to get close but not on it)
                    if (!onSamePlatform && platform === playerPlatform) return;
                    
                    // Check if platform has spikes
                    let hasSpikes = false;
                    if (this.spikes) {
                        const platformLeft = platform.x - platform.width / 2;
                        const platformRight = platform.x + platform.width / 2;
                        const platformTop = platform.y - platform.body.height / 2;
                        
                        this.spikes.getChildren().forEach((spike) => {
                            if (spike && spike.active) {
                                const spikeX = spike.x;
                                const spikeY = spike.y;
                                if (spikeX >= platformLeft && spikeX <= platformRight && 
                                    Math.abs(spikeY - platformTop) < 20) {
                                    hasSpikes = true;
                                }
                            }
                        });
                    }
                    
                    if (hasSpikes) return;
                    
                    const dx = platform.x - enemyX;
                    const dy = (platform.y - platform.body.height / 2) - enemyY;
                    const horizontalDist = Math.abs(dx);
                    const verticalDist = Math.abs(dy);
                    
                    // Calculate distance to player from this platform
                    const platformToPlayerDist = playerPlatform ? 
                        Math.abs(platform.x - playerPlatform.x) : 
                        Math.abs(platform.x - playerX);
                    
                    // Check if platform is within jump range
                    if (horizontalDist <= maxJumpDistance && horizontalDist > 30 && 
                        verticalDist <= maxVerticalDistance) {
                        candidatePlatforms.push({
                            platform: platform,
                            distance: horizontalDist,
                            dx: dx,
                            dy: dy,
                            distanceToPlayer: platformToPlayerDist
                        });
                    }
                });
                
                // If we found candidate platforms, jump to one
                if (candidatePlatforms.length > 0) {
                    console.log('Found', candidatePlatforms.length, 'candidate platforms for enemy jump');
                    
                    // Sort by distance to player (closer to player = better)
                    candidatePlatforms.sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);
                    
                    // Pick one of the closest platforms to player (top 3 closest)
                    const topCandidates = candidatePlatforms.slice(0, Math.min(3, candidatePlatforms.length));
                    const target = topCandidates[Math.floor(Math.random() * topCandidates.length)];
                    const targetPlatform = target.platform;
                    const targetY = targetPlatform.y - targetPlatform.body.height / 2;
                    
                    // Calculate jump velocity to reach target platform more accurately
                    const horizontalDist = Math.abs(target.dx);
                    const verticalDist = targetY - enemyY;
                    
                    console.log('Jump calculation - From:', enemyX.toFixed(1), enemyY.toFixed(1), 'To:', targetPlatform.x.toFixed(1), targetY.toFixed(1), 'Horizontal:', horizontalDist.toFixed(1), 'Vertical:', verticalDist.toFixed(1));
                    
                    // Calculate time to travel horizontal distance
                    // Use a faster horizontal speed for better accuracy and to ensure reaching the platform
                    const horizontalSpeed = enemy.moveSpeed * 3.5; // Increased from 2.5 to 3.5
                    const jumpTime = horizontalDist / horizontalSpeed;
                    
                    // Calculate vertical velocity needed using physics
                    // y = v0*t + 0.5*a*t^2
                    // We want to reach targetY from enemyY in jumpTime
                    // gravity = 800 (from world physics)
                    const gravity = 800;
                    const requiredVerticalVelocity = (verticalDist - 0.5 * gravity * jumpTime * jumpTime) / jumpTime;
                    
                    // Clamp vertical velocity to reasonable range (wider range for better jumps)
                    let verticalVelocity = Math.max(enemy.jumpSpeed * 0.2, Math.min(enemy.jumpSpeed * 1.8, requiredVerticalVelocity));
                    
                    // If jumping down significantly, reduce upward velocity but not too much
                    if (verticalDist > 50) {
                        verticalVelocity = Math.min(verticalVelocity, enemy.jumpSpeed * 0.7);
                    }
                    
                    // If jumping up significantly, ensure we have enough upward velocity
                    if (verticalDist < -100) {
                        verticalVelocity = Math.max(verticalVelocity, enemy.jumpSpeed * 1.3);
                    }
                    
                    // Set horizontal velocity toward target (ensure it's fast enough)
                    const horizontalVelocity = target.dx > 0 ? horizontalSpeed : -horizontalSpeed;
                    
                    console.log('Jump velocities - Horizontal:', horizontalVelocity.toFixed(1), 'Vertical:', verticalVelocity.toFixed(1), 'Jump time:', jumpTime.toFixed(2), 'Required VY:', requiredVerticalVelocity.toFixed(1));
                    
                    // Make the jump
                    enemy.setVelocityX(horizontalVelocity);
                    enemy.setVelocityY(verticalVelocity);
                    enemy.lastJumpTime = currentTime;
                    
                    console.log('Enemy jumping! Target platform:', targetPlatform.x, 'Distance to player:', target.distanceToPlayer);
                } else {
                    // No suitable platforms found - don't jump (stay on current platform)
                    console.log('No candidate platforms found for enemy jump. Enemy at:', enemyX.toFixed(1), enemyY.toFixed(1), 'Enemy platform:', enemyPlatform ? enemyPlatform.x : 'none');
                }
            }
            
            // Safety check: If enemy is falling and not on ground, find nearest platform and teleport
            if (!isOnGround && enemy.body.velocity.y > 100 && enemy.y > 200) {
                // Enemy is falling - find the nearest platform and teleport to it
                let nearestPlatform = null;
                let nearestDistance = Infinity;
                
                this.platforms.getChildren().forEach((platform) => {
                    if (!platform || !platform.body) return;
                    
                    // Check if platform has spikes
                    let hasSpikes = false;
                    if (this.spikes) {
                        const platformLeft = platform.x - platform.width / 2;
                        const platformRight = platform.x + platform.width / 2;
                        const platformTop = platform.y - platform.body.height / 2;
                        
                        this.spikes.getChildren().forEach((spike) => {
                            if (spike && spike.active) {
                                const spikeX = spike.x;
                                const spikeY = spike.y;
                                if (spikeX >= platformLeft && spikeX <= platformRight && 
                                    Math.abs(spikeY - platformTop) < 20) {
                                    hasSpikes = true;
                                }
                            }
                        });
                    }
                    
                    if (hasSpikes) return;
                    
                    const dx = platform.x - enemy.x;
                    const dy = platform.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestPlatform = platform;
                    }
                });
                
                // Teleport enemy to nearest platform if found
                if (nearestPlatform) {
                    const platformTop = nearestPlatform.y - nearestPlatform.body.height / 2;
                    enemy.setPosition(nearestPlatform.x, platformTop - 5);
                    enemy.setVelocity(0, 0);
                    console.log('Enemy teleported to platform at:', nearestPlatform.x, platformTop);
                }
            }
            
            // Apply drag when on ground to slow down
            if (isOnGround) {
                enemy.setDragX(300);
            }
            
            // Throw pancake if player is in range and cooldown is ready
            // But NOT if player and enemy are on the same platform
            if (distance <= enemy.throwRange && currentTime - enemy.lastThrowTime >= enemy.throwCooldown) {
                // Check if enemy and player are on the same platform
                const enemyX = enemy.x;
                const enemyY = enemy.y;
                const playerX = this.player.x;
                const playerY = this.player.y;
                const playerBottom = playerY + this.player.body.height / 2;
                
                let enemyPlatform = null;
                let playerPlatform = null;
                
                // Find which platform the enemy is on
                this.platforms.getChildren().forEach((platform) => {
                    if (!platform || !platform.body) return;
                    
                    const platformLeft = platform.x - platform.width / 2;
                    const platformRight = platform.x + platform.width / 2;
                    const platformTop = platform.y - platform.body.height / 2;
                    
                    // Check enemy platform
                    const enemyOnPlatform = enemyX >= platformLeft - 10 && enemyX <= platformRight + 10 &&
                                          enemyY >= platformTop - 5 && enemyY <= platformTop + 25;
                    if (enemyOnPlatform && !enemyPlatform) {
                        enemyPlatform = platform;
                    }
                    
                    // Check player platform
                    const playerOnPlatform = playerX >= platformLeft && playerX <= platformRight &&
                                           playerBottom >= platformTop - 10 && playerBottom <= platformTop + 5;
                    if (playerOnPlatform && !playerPlatform) {
                        playerPlatform = platform;
                    }
                });
                
                // Only throw if NOT on the same platform
                if (enemyPlatform !== playerPlatform) {
                    this.throwPancake(enemy);
                    enemy.lastThrowTime = currentTime;
                }
            }
        });
        
        // Clean up pancakes that go off screen or fall too far
        if (this.pancakes) {
            this.pancakes.getChildren().forEach((pancake) => {
                if (!pancake || !pancake.active) return;
                
                // Remove if off screen or fallen too far
                if (pancake.y > 1000 || pancake.x < -100 || pancake.x > 4100) {
                    pancake.destroy();
                }
            });
        }
    }

    updateAnimation(isOnGround, isMoving, isMovingUp, isMovingDown) {
        let newPose = 'idle';
        
        // Determine which pose to use based on player state
        if (!isOnGround) {
            // In the air
            if (isMovingUp) {
                newPose = 'jumping'; // Going up = jumping pose
            } else if (isMovingDown) {
                newPose = 'falling'; // Going down = falling pose
            } else {
                newPose = 'falling'; // Default to falling if in air
            }
        } else {
            // On the ground
            if (isMoving) {
                // Walking animation - alternate between walking1 and walking2
                this.walkFrameCounter++;
                if (this.walkFrameCounter >= this.walkFrameDelay) {
                    this.walkFrameCounter = 0;
                    // Toggle between frame 1 and 2
                    this.walkFrame = (this.walkFrame === 1) ? 2 : 1;
                }
                newPose = 'walking' + this.walkFrame; // 'walking1' or 'walking2'
            } else {
                newPose = 'idle'; // Not moving = idle pose
                // Reset walking animation when stopped
                this.walkFrameCounter = 0;
                this.walkFrame = 1;
            }
        }
        
        // For walking, always update texture to show animation
        // For other poses, only change if pose actually changed
        if (newPose.startsWith('walking') || newPose !== this.currentPose) {
            this.currentPose = newPose;
            const textureName = 'stickman_' + newPose;
            this.player.setTexture(textureName);
        }
        
        // Update eye position based on facing direction
        // Since we're using setFlipX, the eye will flip with the sprite
        // But we need to handle the eye separately for proper positioning
        // For now, the flip will work, but the eye might need special handling
        // The eye is drawn on the right side by default, so when flipped it goes to left
    }
}
