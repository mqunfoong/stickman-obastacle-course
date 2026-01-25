import Phaser from 'phaser';

// Level 2 Scene - Snow themed level
// Global flag to track if background music has been initialized
let backgroundMusicInitialized = false;
let globalBackgroundMusic = null;

export class Level2Scene extends Phaser.Scene {
    constructor() {
        super({ key: 'Level2Scene' });
    }

    preload() {
        // Load background music (same as Level 1)
        const musicPath = 'assets/sounds/background.mp3';
        console.log('Level 2: Attempting to load music from:', musicPath);
        
        this.load.audio('backgroundMusic', musicPath);
        
        // Load hit sound effect
        const hitSoundPath = 'assets/sounds/hit.mp3';
        this.load.audio('hitSound', hitSoundPath);
        
        // Load victory sound effect
        const victorySoundPath = 'assets/sounds/victory.mp3';
        this.load.audio('victorySound', victorySoundPath);
        
        // Load Pringle image
        this.load.image('pringle', 'assets/images/Pringle.png');
    }

    create() {
        console.log('Level2Scene create() function called!');
        
        // Set darker, cloudier sky background color
        this.cameras.main.setBackgroundColor(0x8FA8B8); // Darker gray-blue, more cloudy
        
        // Set world bounds - make the world much wider than the screen
        this.physics.world.setBounds(0, 0, 4000, 1000, true, true, false, false);
        
        // Create snow-themed background elements first (behind everything)
        this.createSnowBackground();
        
        // Create the stickman player first
        this.createStickman();
        
        // Create ground and platforms (snow themed)
        this.createGroundAndPlatforms();
        
        // Create white turtle texture
        this.createWhiteTurtleTexture();
        
        // Create snowball texture
        this.createSnowballTexture();
        
        // Create giant snowball texture for rolling hill obstacle
        this.createGiantSnowballTexture();
        
        // Create snowman texture
        this.createSnowmanTexture();
        
        // Create snowman with hat texture
        this.createSnowmanWithHatTexture();
        
        // Create hat texture (for falling hat after knockoff)
        this.createHatTexture();
        
        // Create enemies (white turtles on unreachable platforms)
        this.createEnemies();
        
        // Create snowmen (ground enemies that chase player)
        this.createSnowmen();
        
        // Set up rolling snowball system
        this.setupRollingSnowball();
        
        // Create secret cloud platform (visual only, no teleport)
        this.createSecretCloud();
        
        // Add Pringle image above the cloud
        this.addPringle();
        
        // Set up camera to follow the player
        this.setupCamera();
        
        // Set up keyboard controls
        this.setupControls();
        
        // Player movement speed
        this.playerSpeed = 200;
        this.jumpSpeed = -500;
        
        // Initialize hearts system
        this.hearts = 3.0; // Use float to support half-heart damage
        this.goldHearts = 0; // Track gold hearts from Pringle collection
        this.lastSpikeHitTime = 0;
        this.spikeHitCooldown = 3000;
        this.isInvincible = false;
        this.invincibilityDuration = 3000;
        this.createHeartsDisplay();
        
        // Initialize points system
        this.points = 0;
        this.collectedPlatforms = new Set();
        this.currentPlatform = null;
        this.createPointsDisplay();
        
        // Gold beam levitation system
        this.isLevitating = false; // Flag to track if player is being levitated
        this.goldBeam = null; // Reference to the gold beam graphics
        this.pringleCloud = null; // Cloud platform for Pringle
        this.secretCloud = null; // Will be set in createSecretCloud
        this.wasOnCloud = false; // Track if player was on cloud last frame
        this.updateLogged = false; // Debug flag
        this.hasLoggedCloudCheck = false; // Debug flag
        this.pringle = null; // Reference to Pringle image
        this.pringleCollected = false; // Track if Pringle has been collected
        this.pringleMissingLogged = false; // Debug flag
        
        // Initialize level completion flag
        this.levelCompleted = false;
        
        // Set up collision between player and platforms/ground
        this.physics.add.collider(this.player, this.platforms);
        if (this.ground) {
            this.physics.add.collider(this.player, this.ground);
        }
        
        // Cloud platforms are just regular platforms, no special collision needed
        
        
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
                console.log('✓ Background music created for Level 2');
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
    }

    setupCamera() {
        // Camera bounds: allow camera to go up to negative Y values to see platforms above
        // x: 0 to 4000, y: -400 to 600 (allows camera to follow player upward)
        this.cameras.main.setBounds(0, -400, 4000, 1000);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(400, 300);
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        // M key for music toggle
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.mKeyJustPressed = false;
        // N and R keys for victory screen
        this.nKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }

    createStickman() {
        try {
            this.createStickmanPose('stickman_idle', 'idle');
            this.createStickmanPose('stickman_walking1', 'walking1');
            this.createStickmanPose('stickman_walking2', 'walking2');
            this.createStickmanPose('stickman_jumping', 'jumping');
            this.createStickmanPose('stickman_falling', 'falling');
            
            this.player = this.physics.add.sprite(100, 450, 'stickman_idle');
            this.player.setOrigin(0.5, 0.5);
            this.player.setCollideWorldBounds(true);
            this.player.setDragX(500);
            this.player.setDepth(5); // Set player depth so snow can render above feet
            
            // Make hitbox tighter (smaller collision box)
            if (this.player.body) {
                // Reduce body size - make it smaller than the sprite for tighter hitbox
                // Keep height closer to original to prevent sinking into floor
                this.player.body.setSize(30, 55); // Width: 30 (narrower), Height: 55 (closer to original 60)
                // Offset to center horizontally, but keep bottom aligned (less vertical offset)
                this.player.body.setOffset(10, 2.5); // Horizontal center, minimal vertical offset
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

    createGroundAndPlatforms() {
        // Create platforms group
        this.platforms = this.physics.add.staticGroup();
        
        const worldWidth = 4000;
        const gameHeight = 600; // Game is 600px tall
        const groundTopY = 550; // Top of ground (where player walks)
        const groundHeight = gameHeight - groundTopY; // Extend to bottom of screen (50px)
        const platformColor = 0xE0E0E0; // Light gray-white color (like brown in Level 1, but ice-themed)
        const platformHeight = 20;
        
        // Create continuous ground that extends to bottom of screen
        // Position rectangle so top is at groundTopY and it extends down to bottom
        // Use white color so it doesn't show through the snow
        const ground = this.add.rectangle(worldWidth / 2, groundTopY + groundHeight/2, worldWidth, groundHeight, 0xFFFFFF);
        this.physics.add.existing(ground, true);
        ground.setOrigin(0.5, 0.5);
        ground.setDepth(-1); // Behind everything
        this.ground = ground;
        
        // Add detailed texture to the ground
        this.addGroundDetail(worldWidth / 2, groundTopY, worldWidth, groundHeight);
        
        // Create smooth hill obstacle (mid-level) - taller and smoother
        const hillStartX = 2100;
        const hillWidth = 800;
        const hillPeakX = hillStartX + hillWidth / 2;
        const hillPeakY = 280; // Taller peak (was 350, now 280 - 70px taller)
        const baseY = groundTopY; // Top of ground
        
        // Create smooth slope using many small overlapping platforms
        const platformSegmentWidth = 20; // Even smaller segments for very smooth slope
        const numSegments = Math.floor(hillWidth / platformSegmentWidth);
        const totalHeight = baseY - hillPeakY; // Total height of hill
        
        // Store hill data for snowball spawning
        this.hillData = {
            startX: hillStartX,
            peakX: hillPeakX,
            peakY: hillPeakY,
            baseY: baseY,
            width: hillWidth
        };
        
        // Create smooth slope going up (left side) - ensure proper overlap
        const segmentsUp = Math.floor(numSegments / 2);
        for (let i = 0; i <= segmentsUp; i++) {
            const t = i / segmentsUp; // 0 to 1
            const x = hillStartX + (i * platformSegmentWidth);
            // Use smoother easing function for more natural curve
            const easedT = t * t * (3 - 2 * t); // Smoothstep function
            const y = baseY - (totalHeight * easedT);
            
            // Make platforms much wider to ensure complete overlap (no gaps)
            const platform = this.add.rectangle(x, y, platformSegmentWidth + 25, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            this.addPlatformDetail(x, y, platformSegmentWidth + 25, platformHeight);
            this.addIceStrip(x, y - platformHeight/2, platformSegmentWidth + 25);
        }
        
        // Peak platform (wider)
        const peakPlatform = this.add.rectangle(hillPeakX, hillPeakY, 160, platformHeight, platformColor);
        this.physics.add.existing(peakPlatform, true);
        peakPlatform.setOrigin(0.5, 0.5);
        this.platforms.add(peakPlatform);
        this.addPlatformDetail(hillPeakX, hillPeakY, 160, platformHeight);
        this.addIceStrip(hillPeakX, hillPeakY - platformHeight/2, 160);
        
        // Create smooth slope going down (right side) - ensure proper overlap
        const segmentsDown = Math.floor(numSegments / 2);
        for (let i = 1; i <= segmentsDown; i++) {
            const t = i / segmentsDown; // 0 to 1
            const x = hillPeakX + (i * platformSegmentWidth);
            // Use smoother easing function for more natural curve (inverted)
            const easedT = t * t * (3 - 2 * t); // Smoothstep function
            const y = hillPeakY + (totalHeight * easedT);
            
            // Make platforms much wider to ensure complete overlap (no gaps)
            const platform = this.add.rectangle(x, y, platformSegmentWidth + 25, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            this.addPlatformDetail(x, y, platformSegmentWidth + 25, platformHeight);
            this.addIceStrip(x, y - platformHeight/2, platformSegmentWidth + 25);
        }
        
        // Fill in the hill with smooth visual (using graphics polygon)
        const hillFill = this.add.graphics();
        hillFill.fillStyle(0xE0E0E0);
        hillFill.beginPath();
        hillFill.moveTo(hillStartX, baseY);
        // Smooth curve up using same easing function
        for (let i = 0; i <= segmentsUp; i++) {
            const t = i / segmentsUp;
            const easedT = t * t * (3 - 2 * t); // Smoothstep function
            const x = hillStartX + (i * platformSegmentWidth);
            const y = baseY - (totalHeight * easedT);
            hillFill.lineTo(x, y);
        }
        // Smooth curve down using same easing function
        for (let i = 1; i <= segmentsDown; i++) {
            const t = i / segmentsDown;
            const easedT = t * t * (3 - 2 * t); // Smoothstep function
            const x = hillPeakX + (i * platformSegmentWidth);
            const y = hillPeakY + (totalHeight * easedT);
            hillFill.lineTo(x, y);
        }
        hillFill.lineTo(hillStartX + hillWidth, baseY);
        hillFill.lineTo(hillStartX, baseY);
        hillFill.closePath();
        hillFill.fillPath();
        hillFill.setDepth(-1);
        
        // Add some additional platforms for variety (snowy white)
        // Refined layout for better balance and flow
        const extraPlatforms = [
            { x: 500, y: 450, width: 160 },      // Early platform - wider for easier landing
            { x: 900, y: 440, width: 130 },       // Slightly lower, creates gentle descent
            { x: 1200, y: 450, width: 140 },      // Back to original height
            { x: 1500, y: 430, width: 120 },      // Lower platform before hill
            // Hill section (2000-2800) - already handled above
            { x: 3000, y: 425, width: 150 },      // After hill - slightly lower for easier landing
            { x: 3200, y: 420, width: 170 },      // Gradual descent continues
            { x: 3400, y: 410, width: 140 },      // Lower platform
            { x: 3600, y: 400, width: 160 }       // Final platform before flag - wider for safety
        ];
        
        extraPlatforms.forEach((platformData, index) => {
            const platform = this.add.rectangle(platformData.x, platformData.y, platformData.width, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            this.addPlatformDetail(platformData.x, platformData.y, platformData.width, platformHeight);
            this.addIceStrip(platformData.x, platformData.y - platformHeight/2, platformData.width);
        });
        
        // Create finish flag on the last platform
        // Add final platform for the flag
        const flagPlatform = { x: 3800, y: 390, width: 150 };
        const finalPlatform = this.add.rectangle(flagPlatform.x, flagPlatform.y, flagPlatform.width, platformHeight, platformColor);
        this.physics.add.existing(finalPlatform, true);
        finalPlatform.setOrigin(0.5, 0.5);
        this.platforms.add(finalPlatform);
        this.addPlatformDetail(flagPlatform.x, flagPlatform.y, flagPlatform.width, platformHeight);
        this.addIceStrip(flagPlatform.x, flagPlatform.y - platformHeight/2, flagPlatform.width);
        this.createFinishFlag(flagPlatform.x, flagPlatform.y);
        
        console.log('Ground and platforms created!');
    }
    
    createSecretCloud() {
        // Create a path of cloud platforms leading to the Pringle
        // Starting cloud (same position as before)
        const startCloudX = 280;
        const startCloudY = 320;
        
        // Create cloud platforms in a formation to reach Pringle
        // Pringle will be on the 4th platform
        // Vary x positions to create an interesting path
        // Increased vertical spacing to prevent hitting platforms above when jumping
        const cloudPositions = [
            { x: 280, y: 320 },   // Starting cloud
            { x: 200, y: 200 },   // Second cloud (up 120 pixels, left)
            { x: 320, y: 80 },    // Third cloud (up 120 pixels, right)
            { x: 180, y: -40 },   // Fourth cloud (up 120 pixels, left) - Pringle will be here
        ];
        
        cloudPositions.forEach((pos, index) => {
            const cloud = this.add.rectangle(pos.x, pos.y, 120, 30, 0xE0E0E0);
            this.physics.add.existing(cloud, true);
            cloud.setOrigin(0.5, 0.5);
            cloud.setAlpha(0.15);
            cloud.setStrokeStyle(2, 0xFFFFFF, 0.15);
            cloud.setDepth(-12);
            
            // Add cloud details
            const cloudDetail1 = this.add.rectangle(pos.x - 30, pos.y - 10, 40, 25, 0xF0F0F0);
            cloudDetail1.setOrigin(0.5, 0.5);
            cloudDetail1.setDepth(-12);
            cloudDetail1.setAlpha(0.15);
            
            const cloudDetail2 = this.add.rectangle(pos.x + 30, pos.y - 10, 40, 25, 0xF0F0F0);
            cloudDetail2.setOrigin(0.5, 0.5);
            cloudDetail2.setDepth(-12);
            cloudDetail2.setAlpha(0.15);
            
            // Add to platforms group
            this.platforms.add(cloud);
            
            // Store first cloud as secretCloud for reference
            if (index === 0) {
                this.secretCloud = cloud;
            }
        });
        
        console.log('Cloud platform path created with', cloudPositions.length, 'platforms');
    }
    
    checkCloudLevitation() {
        // Check if player is on the secret cloud and start levitation
        if (!this.secretCloud || !this.player || !this.player.active || this.isLevitating) {
            this.wasOnCloud = false;
            return;
        }
        
        // Use Phaser's overlap check - simpler and more reliable
        const cloudBounds = this.secretCloud.getBounds();
        const playerBounds = this.player.getBounds();
        const overlaps = Phaser.Geom.Rectangle.Overlaps(cloudBounds, playerBounds);
        
        // Check if player is on top (touching down means they're standing on it)
        const isOnCloud = overlaps && this.player.body.touching.down;
        
        // Debug: Log when overlapping (even if not on top yet)
        if (overlaps && !this.wasOnCloud) {
            console.log('Player overlapping cloud. Touching down:', this.player.body.touching.down, 
                      'Player Y:', this.player.y.toFixed(1), 'Cloud Y:', this.secretCloud.y.toFixed(1));
        }
        
        // If player just landed on cloud (wasn't on it last frame), start levitation
        if (isOnCloud && !this.wasOnCloud) {
            console.log('*** PLAYER LANDED ON CLOUD! Starting levitation... ***');
            console.log('Player Y:', this.player.y, 'Cloud Y:', this.secretCloud.y);
            console.log('Player touching down:', this.player.body.touching.down);
            this.startLevitation();
        }
        
        // Update tracking
        this.wasOnCloud = isOnCloud;
    }
    
    startLevitation() {
        if (this.isLevitating) return; // Already levitating
        
        console.log('Starting levitation!');
        this.isLevitating = true;
        
        // Disable player physics temporarily
        this.player.body.setGravityY(0);
        this.player.body.setVelocity(0, 0);
        
        // Create gold beam of light
        const beamX = this.secretCloud.x;
        const beamStartY = this.secretCloud.y;
        const beamEndY = this.pringleCloud ? this.pringleCloud.y : -100;
        
        // Create beam graphics
        this.goldBeam = this.add.graphics();
        this.goldBeam.setDepth(5);
        
        // Draw animated gold beam
        const drawBeam = () => {
            if (!this.goldBeam || !this.isLevitating || !this.player) return;
            
            this.goldBeam.clear();
            
            const currentBeamX = this.player.x;
            const currentBeamStartY = this.secretCloud.y;
            const currentBeamEndY = this.pringleCloud ? this.pringleCloud.y : -100;
            const currentPlayerY = this.player.y;
            
            // Gold color
            const goldColor = 0xFFD700;
            
            // Draw main beam from cloud to Pringle cloud
            const totalBeamHeight = currentBeamEndY - currentBeamStartY;
            this.goldBeam.fillStyle(goldColor, 0.6);
            this.goldBeam.fillRect(currentBeamX - 20, currentBeamStartY, 40, totalBeamHeight);
            
            // Draw inner brighter core
            this.goldBeam.fillStyle(0xFFFF00, 0.8);
            this.goldBeam.fillRect(currentBeamX - 10, currentBeamStartY, 20, totalBeamHeight);
            
            // Draw particles/sparkles
            const time = this.time.now;
            for (let i = 0; i < 15; i++) {
                const y = currentBeamStartY + ((currentPlayerY - currentBeamStartY) * (i / 15)) + Math.sin(time * 0.01 + i) * 5;
                const x = currentBeamX + Math.cos(time * 0.01 + i) * 15;
                this.goldBeam.fillStyle(0xFFFF00, 0.9);
                this.goldBeam.fillCircle(x, y, 3);
            }
        };
        
        // Animate beam
        this.beamTimer = this.time.addEvent({
            delay: 16,
            callback: drawBeam,
            loop: true
        });
        
        drawBeam();
        
        // Move player up on Y axis
        const targetY = this.pringleCloud ? this.pringleCloud.y - 40 : -100;
        const duration = 2000;
        
        this.tweens.add({
            targets: this.player,
            y: targetY,
            duration: duration,
            ease: 'Power1',
            onComplete: () => {
                // Re-enable physics
                this.player.body.setGravityY(800);
                this.isLevitating = false;
                
                // Clean up beam
                if (this.goldBeam) {
                    this.goldBeam.destroy();
                    this.goldBeam = null;
                }
                if (this.beamTimer) {
                    this.beamTimer.destroy();
                    this.beamTimer = null;
                }
            }
        });
    }
    
    addPringle() {
        // Pringle will be on the 4th cloud platform (which is at x: 180, y: -40)
        // The platform is already created in createSecretCloud, so we just add the Pringle image
        const pringleX = 180; // Same x as 4th platform
        const pringleY = -40; // Same y as 4th platform
        
        // Position Pringle slightly above the cloud platform
        const pringleImageY = pringleY - 40; // Slightly above the cloud platform
        
        // Check if the image was loaded successfully
        if (this.textures.exists('pringle')) {
            const pringle = this.add.image(pringleX, pringleImageY, 'pringle');
            pringle.setOrigin(0.5, 0.5);
            pringle.setDepth(10); // Above other elements
            
            // Scale to player size (player body is about 30x55)
            // Scale based on original image size to make it similar to player
            const targetWidth = 30; // Similar to player width
            const targetHeight = 55; // Similar to player height
            const originalWidth = pringle.width;
            const originalHeight = pringle.height;
            
            // Calculate scale to fit within target size while maintaining aspect ratio
            const scaleX = targetWidth / originalWidth;
            const scaleY = targetHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions
            
            // Make it two times the current size
            pringle.setScale(scale * 2);
            
            // Add static physics body for overlap detection
            this.physics.add.existing(pringle, true); // true = static
            pringle.body.setSize(pringle.width * pringle.scaleX, pringle.height * pringle.scaleY);
            
            // Store reference to Pringle
            this.pringle = pringle;
            this.pringleCollected = false; // Track if Pringle has been collected
            
            // Set up overlap detector for collection
            this.physics.add.overlap(this.player, pringle, () => {
                if (!this.pringleCollected && pringle.active) {
                    console.log('OVERLAP DETECTED - Collecting Pringle!');
                    this.collectPringle(pringle);
                }
            });
            
            console.log('Pringle image added at x:', pringleX, 'y:', pringleImageY, 'scale:', scale);
            console.log('Pringle reference stored:', !!this.pringle);
        } else {
            console.warn('Pringle image not found. Make sure the file is in assets/images/ with a valid extension (png, jpg, jpeg, gif, or webp)');
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
                
                // Show victory screen (same as reachFinish)
                const screenX = 400;
                const screenY = 300;
                
                const bgRect = this.add.rectangle(screenX, screenY, 600, 300, 0x000000, 0.7);
                bgRect.setScrollFactor(0, 0);
                bgRect.setDepth(9999);
                bgRect.setOrigin(0.5, 0.5);
                
                const victoryText = this.add.text(screenX, screenY - 50, 'LEVEL 2 COMPLETE!', {
                    fontSize: '48px',
                    fill: '#00FF00',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                });
                victoryText.setOrigin(0.5, 0.5);
                victoryText.setScrollFactor(0, 0);
                victoryText.setDepth(10000);
                
                const victoryPointsText = this.add.text(screenX, screenY + 20, `Points: ${this.points}`, {
                    fontSize: '32px',
                    fill: '#FFFFFF',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2
                });
                victoryPointsText.setOrigin(0.5, 0.5);
                victoryPointsText.setScrollFactor(0, 0);
                victoryPointsText.setDepth(10000);
                
                const nextLevelText = this.add.text(screenX, screenY + 50, 'Press N for Level 3', {
                    fontSize: '24px',
                    fill: '#00FF00',
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2
                });
                nextLevelText.setOrigin(0.5, 0.5);
                nextLevelText.setScrollFactor(0, 0);
                nextLevelText.setDepth(10000);
                
                const restartText = this.add.text(screenX, screenY + 90, 'Press R to restart', {
                    fontSize: '24px',
                    fill: '#00FF00',
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
                this.nextLevelText = nextLevelText;
                this.restartText = restartText;
                
                // Play victory sound if available
                if (this.victorySound) {
                    this.victorySound.play();
                }
            }
        });
    }


    takeDamage(amount) {
        // Take damage, using gold hearts first, then regular hearts
        let remainingDamage = amount;
        
        // Use gold hearts first
        if (this.goldHearts > 0 && remainingDamage > 0) {
            if (this.goldHearts >= remainingDamage) {
                this.goldHearts -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= this.goldHearts;
                this.goldHearts = 0;
            }
        }
        
        // Use regular hearts for remaining damage
        if (remainingDamage > 0) {
            this.hearts -= remainingDamage;
        }
        
        this.updateHeartsDisplay();
    }

    hitSpike() {
        // Check if player is invincible
        if (this.isInvincible) {
            return;
        }
        
        // Check cooldown
        const currentTime = this.time.now;
        if (currentTime - this.lastSpikeHitTime < this.spikeHitCooldown) {
            return; // Still in cooldown
        }
        
        this.lastSpikeHitTime = currentTime;
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Deal 1 damage (use gold hearts first)
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Check if player is dead
        if (this.hearts <= 0) {
            this.scene.restart();
        }
    }

    createWhiteTurtleTexture() {
        // Create white turtle texture for snow theme
        if (!this.textures.exists('whiteTurtle')) {
            const turtleWidth = 45;
            const turtleHeight = 35;
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = turtleWidth / 2;
            const centerY = turtleHeight / 2;
            
            // Turtle shell - large, domed, white/light gray color
            graphics.fillStyle(0xF5F5F5); // Light gray/white for shell
            const shellCenterX = centerX;
            const shellCenterY = centerY + 2;
            const shellWidth = 36;
            const shellHeight = 24;
            // Draw a more domed shell (taller ellipse)
            graphics.fillEllipse(shellCenterX, shellCenterY, shellWidth, shellHeight);
            
            // Shell pattern - hexagonal/segmented pattern (lighter gray)
            graphics.fillStyle(0xC0C0C0); // Light gray for pattern
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
            
            // Turtle head - smaller, more turtle-like (light gray)
            graphics.fillStyle(0xE0E0E0); // Light gray for head
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
            graphics.fillStyle(0xE0E0E0); // Light gray for legs
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
            graphics.fillStyle(0xE0E0E0); // Light gray for tail
            const tailX = shellCenterX;
            const tailY = shellCenterY + shellHeight / 2 + 2;
            graphics.fillTriangle(
                tailX, tailY,
                tailX - 3, tailY + 4,
                tailX + 3, tailY + 4
            );
            
            // Generate texture
            graphics.generateTexture('whiteTurtle', turtleWidth, turtleHeight);
            graphics.destroy();
            
            console.log('White turtle texture created successfully');
        } else {
            console.log('White turtle texture already exists');
        }
        
        // Verify texture was created
        if (this.textures.exists('whiteTurtle')) {
            console.log('✓ White turtle texture verified');
        } else {
            console.error('✗ White turtle texture NOT found after creation!');
        }
    }

    createSnowballTexture() {
        // Create detailed snowball texture
        if (!this.textures.exists('snowball')) {
            const snowballSize = 24; // 24x24 pixel texture
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = snowballSize / 2;
            const centerY = snowballSize / 2;
            const radius = 11;
            
            // Base snowball - white circle with gradient effect
            graphics.fillStyle(0xFFFFFF); // Pure white base
            graphics.fillCircle(centerX, centerY, radius);
            
            // Add depth with darker areas (shadows)
            graphics.fillStyle(0xF0F0F0); // Slightly darker white for shadow
            // Bottom shadow (where light doesn't hit)
            graphics.fillEllipse(centerX, centerY + 2, radius * 1.4, radius * 0.6);
            
            // Side shadow
            graphics.fillEllipse(centerX - 3, centerY, radius * 0.7, radius * 1.2);
            
            // Add highlights (bright spots where light hits)
            graphics.fillStyle(0xFFFFFF); // Bright white
            // Top highlight
            graphics.fillCircle(centerX - 2, centerY - 3, 4);
            graphics.fillCircle(centerX + 1, centerY - 2, 3);
            
            // Add texture details (small bumps/imperfections)
            graphics.fillStyle(0xF8F8F8); // Very light gray
            // Small texture dots
            graphics.fillCircle(centerX + 4, centerY + 1, 1.5);
            graphics.fillCircle(centerX - 3, centerY + 3, 1);
            graphics.fillCircle(centerX + 2, centerY + 4, 1.5);
            
            // Add subtle outline for definition
            graphics.lineStyle(1, 0xE8E8E8, 0.6); // Light gray outline
            graphics.strokeCircle(centerX, centerY, radius);
            
            // Generate texture
            graphics.generateTexture('snowball', snowballSize, snowballSize);
            graphics.destroy();
            
            console.log('Snowball texture created successfully');
        } else {
            console.log('Snowball texture already exists');
        }
        
        // Verify texture was created
        if (this.textures.exists('snowball')) {
            console.log('✓ Snowball texture verified');
        } else {
            console.error('✗ Snowball texture NOT found after creation!');
        }
    }

    createGiantSnowballTexture() {
        // Create giant snowball texture for rolling down the hill
        if (!this.textures.exists('giantSnowball')) {
            const snowballSize = 80; // 80x80 pixel texture (much larger)
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = snowballSize / 2;
            const centerY = snowballSize / 2;
            const radius = 38;
            
            // Base snowball - white circle with gradient effect
            graphics.fillStyle(0xFFFFFF); // Pure white base
            graphics.fillCircle(centerX, centerY, radius);
            
            // Add depth with darker areas (shadows)
            graphics.fillStyle(0xF0F0F0); // Slightly darker white for shadow
            // Bottom shadow (where light doesn't hit)
            graphics.fillEllipse(centerX, centerY + 4, radius * 1.4, radius * 0.6);
            
            // Side shadow
            graphics.fillEllipse(centerX - 5, centerY, radius * 0.7, radius * 1.2);
            
            // Add highlights (bright spots where light hits)
            graphics.fillStyle(0xFFFFFF); // Bright white
            // Top highlight
            graphics.fillCircle(centerX - 4, centerY - 6, 8);
            graphics.fillCircle(centerX + 2, centerY - 4, 6);
            graphics.fillCircle(centerX - 1, centerY - 8, 5);
            
            // Add texture details (small bumps/imperfections)
            graphics.fillStyle(0xF8F8F8); // Very light gray
            graphics.fillCircle(centerX + 8, centerY + 2, 3);
            graphics.fillCircle(centerX - 6, centerY + 5, 2.5);
            graphics.fillCircle(centerX + 4, centerY + 6, 2);
            
            // Add subtle outline for definition
            graphics.lineStyle(2, 0xE8E8E8, 0.6); // Light gray outline
            graphics.strokeCircle(centerX, centerY, radius);
            
            // Generate texture
            graphics.generateTexture('giantSnowball', snowballSize, snowballSize);
            graphics.destroy();
            
            console.log('Giant snowball texture created successfully');
        } else {
            console.log('Giant snowball texture already exists');
        }
    }

    createSnowmanTexture() {
        // Create snowman enemy texture
        if (!this.textures.exists('snowman')) {
            const snowmanWidth = 50;
            const snowmanHeight = 75; // Increased height to accommodate full rounded head
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = snowmanWidth / 2;
            
            // Bottom snowball (largest)
            const bottomY = snowmanHeight - 20;
            graphics.fillStyle(0xFFFFFF);
            graphics.fillCircle(centerX, bottomY, 18);
            
            // Middle snowball
            const middleY = bottomY - 25;
            graphics.fillCircle(centerX, middleY, 14);
            
            // Head (top snowball) - positioned to ensure full circle is visible
            const headY = middleY - 18; // Slightly closer to middle for better proportions
            const headRadius = 10;
            graphics.fillCircle(centerX, headY, headRadius);
            
            // Eyes (black circles)
            graphics.fillStyle(0x000000);
            graphics.fillCircle(centerX - 3, headY - 2, 2);
            graphics.fillCircle(centerX + 3, headY - 2, 2);
            
            // Nose (carrot - orange triangle)
            graphics.fillStyle(0xFF8C00);
            graphics.fillTriangle(
                centerX, headY + 1,
                centerX - 2, headY + 5,
                centerX + 2, headY + 5
            );
            
            // Buttons (black circles on middle ball)
            graphics.fillStyle(0x000000);
            graphics.fillCircle(centerX, middleY - 5, 1.5);
            graphics.fillCircle(centerX, middleY, 1.5);
            graphics.fillCircle(centerX, middleY + 5, 1.5);
            
            // Arms (sticks - brown)
            graphics.fillStyle(0x8B4513);
            graphics.fillRect(centerX - 14, middleY - 3, 8, 3);
            graphics.fillRect(centerX + 6, middleY - 3, 8, 3);
            
            // Note: Hat is handled as a separate sprite, not drawn on the base texture
            // This ensures the head is fully white/snow colored
            
            // Add outline for definition
            graphics.lineStyle(1, 0xE0E0E0, 0.5);
            graphics.strokeCircle(centerX, bottomY, 18);
            graphics.strokeCircle(centerX, middleY, 14);
            graphics.strokeCircle(centerX, headY, headRadius);
            
            // Generate texture
            graphics.generateTexture('snowman', snowmanWidth, snowmanHeight);
            graphics.destroy();
            
            console.log('Snowman texture created successfully');
        } else {
            console.log('Snowman texture already exists');
        }
    }

    createSnowmanWithHatTexture() {
        // Create snowman with hat texture (hat is part of the sprite)
        // Remove existing texture if it exists to force regeneration
        if (this.textures.exists('snowmanWithHat')) {
            this.textures.remove('snowmanWithHat');
        }
        
        // Always create the texture
        const snowmanWidth = 50;
        const snowmanHeight = 75;
        
        const graphics = this.add.graphics();
        graphics.clear();
        
        const centerX = snowmanWidth / 2;
        
        // Bottom snowball (largest)
        const bottomY = snowmanHeight - 20;
        graphics.fillStyle(0xFFFFFF);
        graphics.fillCircle(centerX, bottomY, 18);
        
        // Middle snowball
        const middleY = bottomY - 25;
        graphics.fillCircle(centerX, middleY, 14);
        
        // Head (top snowball)
        const headY = middleY - 18;
        const headRadius = 10;
        graphics.fillCircle(centerX, headY, headRadius);
        
        // Eyes (black circles)
        graphics.fillStyle(0x000000);
        graphics.fillCircle(centerX - 3, headY - 2, 2);
        graphics.fillCircle(centerX + 3, headY - 2, 2);
        
        // Nose (carrot - orange triangle)
        graphics.fillStyle(0xFF8C00);
        graphics.fillTriangle(
            centerX, headY + 1,
            centerX - 2, headY + 5,
            centerX + 2, headY + 5
        );
        
        // Buttons (black circles on middle ball)
        graphics.fillStyle(0x000000);
        graphics.fillCircle(centerX, middleY - 5, 1.5);
        graphics.fillCircle(centerX, middleY, 1.5);
        graphics.fillCircle(centerX, middleY + 5, 1.5);
        
        // Arms (sticks - brown)
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(centerX - 14, middleY - 3, 8, 3);
        graphics.fillRect(centerX + 6, middleY - 3, 8, 3);
        
        // Hat (black cylinder) - part of the sprite - made longer
        graphics.fillStyle(0x000000);
        // Hat brim (wider base)
        graphics.fillRect(centerX - 9, headY - 10, 18, 3);
        // Hat cylinder (narrower top) - made longer (8 pixels tall instead of 4)
        graphics.fillRect(centerX - 6, headY - 18, 12, 8);
        // Hat top (small cap)
        graphics.fillRect(centerX - 5, headY - 19, 10, 1);
        // Hat band (decorative)
        graphics.fillStyle(0x2C2C2C);
        graphics.fillRect(centerX - 6, headY - 16, 12, 2);
        
        // Add outline for definition
        graphics.lineStyle(1, 0xE0E0E0, 0.5);
        graphics.strokeCircle(centerX, bottomY, 18);
        graphics.strokeCircle(centerX, middleY, 14);
        graphics.strokeCircle(centerX, headY, headRadius);
        
        // Generate texture
        graphics.generateTexture('snowmanWithHat', snowmanWidth, snowmanHeight);
        graphics.destroy();
        
        console.log('Snowman with hat texture created successfully');
    }

    createHatTexture() {
        // Create top hat texture
        if (!this.textures.exists('topHat')) {
            const hatWidth = 20;
            const hatHeight = 16; // Slightly taller for better proportions
            
            const graphics = this.add.graphics();
            graphics.clear();
            
            const centerX = hatWidth / 2;
            
            // Hat brim (bottom, wider) - more refined
            graphics.fillStyle(0x000000);
            graphics.fillRect(0, hatHeight - 5, hatWidth, 5);
            // Brim edge highlight for depth
            graphics.fillStyle(0x1a1a1a);
            graphics.fillRect(0, hatHeight - 5, hatWidth, 1);
            
            // Hat cylinder (top, narrower) - with slight taper
            graphics.fillStyle(0x000000);
            graphics.fillRect(4, 0, 12, hatHeight - 5);
            
            // Hat band (decorative band) - more visible
            graphics.fillStyle(0x2C2C2C);
            graphics.fillRect(4, hatHeight - 7, 12, 2);
            // Band highlight
            graphics.fillStyle(0x404040);
            graphics.fillRect(4, hatHeight - 7, 12, 1);
            
            // Hat top (small cap for detail)
            graphics.fillStyle(0x000000);
            graphics.fillRect(6, 0, 8, 1);
            
            // Add subtle outline for definition
            graphics.lineStyle(1, 0x0a0a0a, 0.3);
            graphics.strokeRect(4, 0, 12, hatHeight - 5);
            graphics.strokeRect(0, hatHeight - 5, hatWidth, 5);
            
            // Generate texture
            graphics.generateTexture('topHat', hatWidth, hatHeight);
            graphics.destroy();
            
            console.log('Top hat texture created successfully');
        }
    }

    setupRollingSnowball() {
        // Create group for rolling snowballs
        this.rollingSnowballs = this.physics.add.group();
        this.currentRollingSnowball = null; // Track the current snowball
        
        // Set up collision with player
        this.physics.add.overlap(this.player, this.rollingSnowballs, this.hitRollingSnowball, null, this);
        
        // Set up collision with ground (so it rolls on ground)
        if (this.ground) {
            this.physics.add.collider(this.rollingSnowballs, this.ground);
        }
        
        // Set up collision with platforms (so it rolls on hill)
        this.physics.add.collider(this.rollingSnowballs, this.platforms);
        
        // Start spawning snowballs every 10 seconds (only if no current snowball)
        this.rollingSnowballTimer = this.time.addEvent({
            delay: 10000, // 10 seconds
            callback: this.spawnRollingSnowball,
            callbackScope: this,
            loop: true
        });
        
        // Spawn first snowball after a short delay
        this.time.delayedCall(2000, () => {
            this.spawnRollingSnowball();
        });
    }

    spawnRollingSnowball() {
        // Only spawn if no current snowball exists
        if (this.currentRollingSnowball && this.currentRollingSnowball.active) {
            return; // Don't spawn if one already exists
        }
        
        if (!this.hillData) {
            console.warn('Hill data not available, cannot spawn rolling snowball');
            return;
        }
        
        // Spawn at the peak of the hill
        const spawnX = this.hillData.peakX;
        const spawnY = this.hillData.peakY - 50; // Slightly above peak
        
        // Create giant snowball
        if (!this.textures.exists('giantSnowball')) {
            this.createGiantSnowballTexture();
        }
        
        const snowball = this.physics.add.sprite(spawnX, spawnY, 'giantSnowball');
        snowball.setOrigin(0.5, 0.5);
        snowball.setScale(1);
        
        // Enable physics
        snowball.body.setGravityY(800);
        snowball.body.setBounce(0.2); // Less bounce
        snowball.body.setFriction(0.05); // Very low friction for rolling
        
        // Give it initial velocity to start rolling down the hill (left) - faster
        snowball.body.setVelocityX(-250); // Much faster initial push left
        snowball.body.setVelocityY(150); // Stronger downward push to help it start rolling
        
        // Add rotation for rolling effect (negative for rolling left)
        // Match rotation speed to horizontal velocity for realistic rolling
        snowball.setAngularVelocity(-300); // Faster rotation for rolling left
        
        // Add to group
        this.rollingSnowballs.add(snowball);
        
        // Track this as the current snowball
        this.currentRollingSnowball = snowball;
        
        // Destroy snowball if it goes off screen (after rolling left)
        this.time.delayedCall(15000, () => {
            if (snowball && snowball.active) {
                snowball.destroy();
                if (this.currentRollingSnowball === snowball) {
                    this.currentRollingSnowball = null;
                }
            }
        });
        
        console.log('Rolling snowball spawned at hill peak');
    }

    hitRollingSnowball(player, snowball) {
        // Check if player is invincible
        if (this.isInvincible) {
            return;
        }
        
        // Check cooldown
        const currentTime = this.time.now;
        if (currentTime - this.lastSpikeHitTime < this.spikeHitCooldown) {
            return; // Still in cooldown
        }
        
        this.lastSpikeHitTime = currentTime;
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Deal 1 damage (use gold hearts first)
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Check if player is dead
        if (this.hearts <= 0) {
            this.scene.restart();
        }
        
        console.log('Player hit by rolling snowball! Hearts remaining:', this.hearts);
    }

    updateRollingSnowballs() {
        // Update rolling snowballs - ensure they keep rolling and clean up off-screen ones
        if (this.rollingSnowballs && this.player) {
            this.rollingSnowballs.getChildren().forEach(snowball => {
                if (snowball && snowball.active) {
                    // Match rotation speed to horizontal velocity for realistic rolling
                    const velX = snowball.body.velocity.x;
                    const targetAngularVel = velX * 2.5; // Rotate faster when moving faster
                    snowball.setAngularVelocity(targetAngularVel);
                    
                    // Keep it rolling fast - add more speed if it's on the hill
                    if (this.hillData && snowball.y < this.hillData.baseY + 50) {
                        // It's on or near the hill, keep it rolling fast
                        if (Math.abs(velX) < 200) {
                            snowball.body.setVelocityX(velX - 30); // Push it left faster
                        }
                    }
                    
                    // Destroy if it reaches player spawn position (x: 100)
                    if (snowball.x <= 100) {
                        snowball.destroy();
                        if (this.currentRollingSnowball === snowball) {
                            this.currentRollingSnowball = null;
                        }
                        return; // Exit early since snowball is destroyed
                    }
                    
                    // Destroy if it falls too far below ground
                    if (snowball.y > 700) {
                        snowball.destroy();
                        if (this.currentRollingSnowball === snowball) {
                            this.currentRollingSnowball = null;
                        }
                    }
                }
            });
        }
    }

    createEnemies() {
        // Create group for enemies
        this.enemies = this.physics.add.group();
        
        // Create group for snowballs (projectiles) - will be created in Phase 5
        // For now, we'll use a placeholder group
        this.snowballs = this.physics.add.group();
        
        // Create unreachable platforms for turtles (high up, player can't reach)
        const unreachablePlatforms = [
            { x: 800, y: 200, width: 120 },   // High platform early in level
            { x: 1800, y: 180, width: 140 },  // High platform near hill
            { x: 2800, y: 220, width: 130 },  // High platform later in level
            { x: 3500, y: 190, width: 130 },  // High platform near end
            { x: 600, y: 210, width: 110 }    // High platform very early
        ];
        
        const platformHeight = 20;
        const platformColor = 0xF0F0F0; // Snowy white
        
        // Store turtle platforms so we can identify them
        this.turtlePlatforms = new Set();
        
        unreachablePlatforms.forEach(platformData => {
            const platform = this.add.rectangle(platformData.x, platformData.y, platformData.width, platformHeight, platformColor);
            this.physics.add.existing(platform, true);
            platform.setOrigin(0.5, 0.5);
            this.platforms.add(platform);
            
            // Mark this platform as a turtle platform
            this.turtlePlatforms.add(platform);
            
            this.addIceStrip(platformData.x, platformData.y - platformHeight/2, platformData.width);
            
            // Add icicles hanging from turtle platforms
            this.addIcicles(platformData.x, platformData.y, platformData.width);
            
            // Create white turtle on this platform
            const turtleY = platformData.y - platformHeight / 2 - 15;
            console.log('Creating turtle at x:', platformData.x, 'y:', turtleY);
            this.createEnemy(platformData.x, turtleY);
        });
        
        console.log('Total enemies created:', this.enemies.getChildren().length);
        
        // Set up collision between enemies and platforms (turtles stay on platforms)
        this.physics.add.collider(this.enemies, this.platforms);
        
        // Also set up collision with ground if it exists
        if (this.ground) {
            this.physics.add.collider(this.enemies, this.ground);
        }
        
        // Snowballs stop on platforms (except turtle platforms) and on the ground
        // Use collider with processCallback to filter out turtle platforms
        this.physics.add.collider(this.snowballs, this.platforms, (obj1, obj2) => {
            // Determine which is the snowball and which is the platform
            let snowball = null;
            if (this.snowballs.contains(obj1)) {
                snowball = obj1;
            } else if (this.snowballs.contains(obj2)) {
                snowball = obj2;
            }
            
            // Destroy the snowball when it hits a platform
            // (Turtle platforms are filtered out by processCallback)
            if (snowball && snowball.active) {
                snowball.destroy();
            }
        }, (snowball, platform) => {
            // Process callback: return false to prevent collision with turtle platforms
            // Return true to allow collision with regular platforms
            if (platform && this.turtlePlatforms && this.turtlePlatforms.has(platform)) {
                return false; // Don't collide with turtle platforms
            }
            return true; // Collide with regular platforms
        });
        
        // Snowballs also stop on the ground
        if (this.ground) {
            this.physics.add.collider(this.snowballs, this.ground, (obj1, obj2) => {
                // Determine which is the snowball and which is the ground
                let snowball = null;
                if (this.snowballs.contains(obj1)) {
                    snowball = obj1;
                } else if (this.snowballs.contains(obj2)) {
                    snowball = obj2;
                }
                
                // Only destroy the snowball, never the ground
                if (snowball && snowball.active) {
                    snowball.destroy();
                }
            });
        }
        
        // Make snowballs overlap with player (to detect hits)
        this.physics.add.overlap(this.player, this.snowballs, this.hitSnowball, null, this);
        
        console.log('Enemies (white turtles) created on unreachable platforms!');
    }

    createSnowmen() {
        // Create group for snowmen enemies
        this.snowmen = this.physics.add.group();
        
        // Create group for hats
        this.hats = this.physics.add.group();
        
        // Create snowmen at strategic positions - spread them out
        // One at hill top, others spread out
        const snowmanPositions = [
            { x: this.hillData.peakX, y: this.hillData.peakY - 15, hasHat: true },  // At hill top with hat
            { x: 1200, y: 520, hasHat: false },  // Early in level
            { x: 3200, y: 520, hasHat: false },  // Later in level
            { x: 3600, y: 520, hasHat: false }   // Near end
        ];
        
        snowmanPositions.forEach(pos => {
            this.createSnowman(pos.x, pos.y, pos.hasHat);
        });
        
        // Set up collision between snowmen and platforms/ground
        this.physics.add.collider(this.snowmen, this.platforms);
        if (this.ground) {
            this.physics.add.collider(this.snowmen, this.ground);
        }
        
        // Set up collision detection (stomp and punch)
        this.physics.add.overlap(this.player, this.snowmen, (player, snowman) => {
            this.handleSnowmanCollision(player, snowman);
        });
        
        // Set up collision between snowmen and hats (for pickup)
        this.physics.add.overlap(this.snowmen, this.hats, (snowman, hat) => {
            this.pickupHat(snowman, hat);
        });
        
        console.log('Snowmen created!');
    }

    createSnowman(x, y, hasHat = false) {
        // Create base snowman texture if needed
        if (!this.textures.exists('snowman')) {
            this.createSnowmanTexture();
        }
        
        // Always use regular snowman texture
        const snowman = this.physics.add.sprite(x, y, 'snowman');
        snowman.setOrigin(0.5, 1); // Anchor at bottom
        snowman.setCollideWorldBounds(true);
        snowman.body.setGravityY(800); // Same gravity as player
        snowman.setDragX(500); // Same drag as player
        
        // Snowman properties
        snowman.speed = 150; // Slightly slower than player
        snowman.jumpSpeed = -450; // Slightly weaker jump than player
        snowman.direction = 1; // 1 = right, -1 = left
        snowman.lastJumpTime = 0;
        snowman.jumpCooldown = 1000; // Can jump every second
        snowman.lastPunchTime = 0;
        snowman.punchCooldown = 1500; // Punch every 1.5 seconds
        snowman.punchRange = 60; // Punch range
        snowman.chaseRange = 800; // How far it can detect player
        snowman.isDead = false;
        snowman.hasHat = hasHat; // Track if this snowman has the hat
        snowman.hatSprite = null; // Will hold the hat sprite if hasHat is true
        snowman.isHatWearer = hasHat; // Mark if this is the special hat-wearing snowman
        snowman.isOriginalHatWearer = hasHat; // Mark the original hat-wearer (never transfers)
        snowman.spawnX = x; // Store spawn position to restrict movement
        
        // Create hat sprite if this snowman has the hat
        if (hasHat) {
            if (!this.textures.exists('topHat')) {
                this.createHatTexture();
            }
            const hat = this.add.sprite(x, y - 72, 'topHat'); // Above head (snowman is 75 tall, head is at ~y-65, hat sits on top)
            hat.setOrigin(0.5, 1); // Anchor at bottom so it sits on head
            hat.setDepth(10); // Above snowman
            snowman.hatSprite = hat;
        }
        
        this.snowmen.add(snowman);
        console.log('Snowman created at x:', x, 'y:', y, 'hasHat:', hasHat);
    }

    updateEnemies() {
        // Update enemy behavior (white turtles throwing snowballs)
        if (!this.enemies || !this.player) return;
        
        const currentTime = this.time.now;
        
        this.enemies.getChildren().forEach((enemy) => {
            if (!enemy || !enemy.active) return;
            
            // Calculate distance to player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If player is within throw range and cooldown is ready, throw snowball
            if (distance <= enemy.throwRange && 
                currentTime - enemy.lastThrowTime >= enemy.throwCooldown) {
                this.throwSnowball(enemy);
                enemy.lastThrowTime = currentTime;
            }
            
            // NO JUMPING - turtles stay on their platforms in Level 2
            // They just throw snowballs at the player
        });
    }

    updateSnowmen() {
        // Update snowman AI - chase player, jump, and punch
        if (!this.snowmen || !this.player) return;
        
        const currentTime = this.time.now;
        
        this.snowmen.getChildren().forEach((snowman) => {
            if (!snowman || !snowman.active || snowman.isDead) return;
            
            // Prevent snowmen from getting stuck in hill area
            // If stuck in hill, move them out to the right side
            // BUT exclude the hill snowman (the one with hat) - it's supposed to be on the hill
            if (!snowman.isHatWearer && this.hillData && snowman.x >= this.hillData.startX && 
                snowman.x <= this.hillData.startX + this.hillData.width && 
                snowman.y > 400 && snowman.y < 550) {
                // Move snowman to the right of the hill
                snowman.x = this.hillData.startX + this.hillData.width + 50;
                snowman.y = 520; // Ground level
                snowman.setVelocityX(0); // Stop movement
                snowman.setVelocityY(0);
                return;
            }
            
            // Calculate distance and direction to player
            const dx = this.player.x - snowman.x;
            const dy = this.player.y - snowman.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Prevent snowmen from entering hill area - stop them before it
            // BUT exclude the hill snowman (the one with hat) - it's supposed to be on the hill
            if (!snowman.isHatWearer && this.hillData && snowman.x >= this.hillData.startX - 50 && 
                snowman.x <= this.hillData.startX + this.hillData.width + 50) {
                // If player is on the other side of the hill, don't try to go through it
                // Instead, wait or move around
                if ((this.player.x < this.hillData.startX && snowman.x > this.hillData.startX) ||
                    (this.player.x > this.hillData.startX + this.hillData.width && 
                     snowman.x < this.hillData.startX + this.hillData.width)) {
                    // Player is on other side, stop trying to go through hill
                    snowman.setVelocityX(0);
                    return;
                }
            }
            
            // Special behavior for hill snowman (the one with hat at hill top)
            // Can only go left, not right past spawn point
            if (snowman.isHatWearer && snowman.hasHat) {
                // Hill snowman - can only move left, not right past spawn
                if (snowman.x >= snowman.spawnX) {
                    // At or to the right of spawn - can only go left
                    if (dx < 0 && distance <= snowman.chaseRange) {
                        // Player is to the left, move left
                        snowman.setVelocityX(-snowman.speed);
                        snowman.direction = -1;
                        snowman.setFlipX(true);
                    } else {
                        // Player is to the right or too far - just sit
                        snowman.setVelocityX(0);
                    }
                } else {
                    // To the left of spawn - can move left or right (but not past spawn)
                    if (distance <= snowman.chaseRange) {
                        if (dx > 0) {
                            // Player is to the right, but don't go past spawn
                            if (snowman.x + snowman.speed * 0.016 < snowman.spawnX) {
                                snowman.setVelocityX(snowman.speed);
                                snowman.direction = 1;
                                snowman.setFlipX(false);
                            } else {
                                snowman.setVelocityX(0);
                            }
                        } else {
                            // Player is to the left, move left
                            snowman.setVelocityX(-snowman.speed);
                            snowman.direction = -1;
                            snowman.setFlipX(true);
                        }
                    } else {
                        snowman.setVelocityX(0);
                    }
                }
            } else if (distance <= snowman.chaseRange) {
                // Regular snowmen - move towards player normally
                // Move towards player
                if (dx > 0) {
                    snowman.setVelocityX(snowman.speed);
                    snowman.direction = 1;
                    snowman.setFlipX(false);
                } else {
                    snowman.setVelocityX(-snowman.speed);
                    snowman.direction = -1;
                    snowman.setFlipX(true);
                }
                
                // Jump if player is above and on ground (but NOT if snowman has hat)
                const isOnGround = snowman.body.touching.down;
                if (!snowman.hasHat && isOnGround && dy < -50 && Math.abs(dx) < 100) {
                    // Player is above, try to jump (only if snowman doesn't have hat)
                    if (currentTime - snowman.lastJumpTime >= snowman.jumpCooldown) {
                        snowman.setVelocityY(snowman.jumpSpeed);
                        snowman.lastJumpTime = currentTime;
                    }
                }
                
                // Jump over gaps if needed (but NOT if snowman has hat)
                if (!snowman.hasHat && isOnGround && Math.abs(dx) > 30 && Math.abs(dx) < 150) {
                    // Check if there's a gap ahead (simplified - jump if moving towards player)
                    if (currentTime - snowman.lastJumpTime >= snowman.jumpCooldown) {
                        // Small chance to jump over gaps
                        if (Math.random() < 0.3) {
                            snowman.setVelocityY(snowman.jumpSpeed);
                            snowman.lastJumpTime = currentTime;
                        }
                    }
                }
                
                // Punch if close enough (for hill snowman)
                if (distance <= snowman.punchRange && 
                    currentTime - snowman.lastPunchTime >= snowman.punchCooldown) {
                    // Check if player is in front (not behind)
                    const facingPlayer = (snowman.direction === 1 && dx > 0) || 
                                        (snowman.direction === -1 && dx < 0);
                    if (facingPlayer && Math.abs(dy) < 30) {
                        // Punch the player - deal damage directly
                        this.snowmanPunch(snowman, this.player);
                        snowman.lastPunchTime = currentTime;
                    }
                }
            } else if (distance <= snowman.chaseRange) {
                // Regular snowmen - move towards player normally
                // Move towards player
                if (dx > 0) {
                    snowman.setVelocityX(snowman.speed);
                    snowman.direction = 1;
                    snowman.setFlipX(false);
                } else {
                    snowman.setVelocityX(-snowman.speed);
                    snowman.direction = -1;
                    snowman.setFlipX(true);
                }
                
                // Jump if player is above and on ground (but NOT if snowman has hat)
                const isOnGround = snowman.body.touching.down;
                if (!snowman.hasHat && isOnGround && dy < -50 && Math.abs(dx) < 100) {
                    // Player is above, try to jump (only if snowman doesn't have hat)
                    if (currentTime - snowman.lastJumpTime >= snowman.jumpCooldown) {
                        snowman.setVelocityY(snowman.jumpSpeed);
                        snowman.lastJumpTime = currentTime;
                    }
                }
                
                // Jump over gaps if needed (but NOT if snowman has hat)
                if (!snowman.hasHat && isOnGround && Math.abs(dx) > 30 && Math.abs(dx) < 150) {
                    // Check if there's a gap ahead (simplified - jump if moving towards player)
                    if (currentTime - snowman.lastJumpTime >= snowman.jumpCooldown) {
                        // Small chance to jump over gaps
                        if (Math.random() < 0.3) {
                            snowman.setVelocityY(snowman.jumpSpeed);
                            snowman.lastJumpTime = currentTime;
                        }
                    }
                }
                
                // Punch if close enough (for regular snowmen)
                if (distance <= snowman.punchRange && 
                    currentTime - snowman.lastPunchTime >= snowman.punchCooldown) {
                    // Check if player is in front (not behind)
                    const facingPlayer = (snowman.direction === 1 && dx > 0) || 
                                        (snowman.direction === -1 && dx < 0);
                    if (facingPlayer && Math.abs(dy) < 30) {
                        // Punch the player - deal damage directly
                        this.snowmanPunch(snowman, this.player);
                        snowman.lastPunchTime = currentTime;
                    }
                }
            } else {
                // Stop moving if player is too far
                snowman.setVelocityX(0);
            }
            
            // Update hat position if snowman has one
            if (snowman.hasHat && snowman.hatSprite) {
                snowman.hatSprite.x = snowman.x;
                snowman.hatSprite.y = snowman.y - 72; // Above head position
                snowman.hatSprite.setFlipX(snowman.flipX);
            }
            
            // If snowman doesn't have hat, try to find and pick it up
            if (!snowman.hasHat && this.hats && this.hats.getChildren().length > 0) {
                // Find nearest hat
                let nearestHat = null;
                let nearestDistance = Infinity;
                
                this.hats.getChildren().forEach(hat => {
                    if (hat && hat.active && hat.canPickup) { // Only look for hats that can be picked up
                        const dx = hat.x - snowman.x;
                        const dy = hat.y - snowman.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < nearestDistance && distance < 100) {
                            nearestDistance = distance;
                            nearestHat = hat;
                        }
                    }
                });
                
                // Move towards hat if found
                if (nearestHat) {
                    const dx = nearestHat.x - snowman.x;
                    if (Math.abs(dx) > 10) {
                        if (dx > 0) {
                            snowman.setVelocityX(snowman.speed);
                            snowman.direction = 1;
                        } else {
                            snowman.setVelocityX(-snowman.speed);
                            snowman.direction = -1;
                        }
                    }
                }
            }
        });
    }

    handleSnowmanCollision(player, snowman) {
        if (!snowman || !snowman.active || snowman.isDead) return;
        
        // Check if player is above snowman (stomping)
        // Make stomp check VERY strict - player must be directly on top of head, falling down
        const playerVelocityY = player.body.velocity.y;
        const playerCenterY = player.y;
        const snowmanCenterY = snowman.y;
        const snowmanHeight = 75; // Snowman height
        const snowmanHeadTop = snowmanCenterY - snowmanHeight / 2; // Top of snowman's head
        
        // Horizontal alignment - must be directly above snowman's head
        const horizontalDistance = Math.abs(player.x - snowman.x);
        const snowmanHeadWidth = 20; // Width of snowman's head (approximately)
        const isHorizontallyAligned = horizontalDistance < snowmanHeadWidth / 2;
        
        // Vertical check - player must be:
        // 1. Falling down with significant speed (velocity > 100, meaning moving downward fast)
        // 2. Player's bottom must be at or just above the snowman's head top
        // 3. Player must be clearly above the snowman (not at the side)
        const playerHeight = player.height || 50;
        const playerBottom = playerCenterY + playerHeight / 2;
        const isAboveHead = playerBottom <= snowmanHeadTop + 8 && playerBottom >= snowmanHeadTop - 5;
        const isFallingFast = playerVelocityY > 100; // Must be falling with significant speed
        
        // Only trigger stomp if ALL conditions are met:
        // - Player is falling down fast (velocity > 100)
        // - Player is horizontally aligned with head (within 10 pixels)
        // - Player's bottom is touching the head (within 8 pixels above, 5 below)
        // - Player center is clearly above snowman center
        if (isFallingFast && isHorizontallyAligned && isAboveHead && playerCenterY < snowmanCenterY - 20) {
            // Check if snowman has hat
            if (snowman.hasHat) {
                // Knock hat off instead of killing
                this.knockHatOff(snowman);
                
                // Bounce player up slightly
                player.setVelocityY(-200);
                return; // Exit early, don't check for punch
            } else {
                // No hat - kill snowman
                this.killSnowman(snowman);
                
                // Bounce player up slightly
                player.setVelocityY(-200);
                return; // Exit early, don't check for punch
            }
        }
        
        // If not stomping, check for punch damage
        // Only damage if snowman is ready to punch and player is at same level
        // Note: This is a backup - the main punch damage is in snowmanPunch() function
        if (this.isInvincible) return;
        
        const dx = Math.abs(player.x - snowman.x);
        const dy = Math.abs(player.y - snowman.y);
        const currentTime = this.time.now;
        
        // Check if close enough for punch damage (side collision)
        // Only damage if snowman is ready to punch and player is at same level
        // Only fire if punch function hasn't fired recently (to avoid double damage)
        if (dx < snowman.punchRange && dy < 30 && 
            player.y >= snowman.y - 15 && player.y <= snowman.y + 10 &&
            currentTime - snowman.lastPunchTime >= snowman.punchCooldown) {
            // Take damage from punch (half a heart)
            // This is a backup in case snowmanPunch doesn't fire
            this.takeDamage(0.5);
            this.updateHeartsDisplay();
            console.log('Snowman collision damage (backup) - hearts:', this.hearts);
            
            if (this.hitSound) {
                this.hitSound.play();
            }
            
            // Set invincibility
            this.isInvincible = true;
            this.time.delayedCall(this.invincibilityDuration, () => {
                this.isInvincible = false;
            });
            
            // Update punch time to prevent double damage
            snowman.lastPunchTime = currentTime;
            
            // Knockback player
            const knockbackDir = player.x > snowman.x ? 1 : -1;
            player.setVelocityX(knockbackDir * 200);
            
            // Check for game over
            if (this.hearts <= 0) {
                this.scene.restart();
            }
        }
    }

    snowmanPunch(snowman, player) {
        if (!player || this.isInvincible) return;
        
        // Deal damage to player (half a heart)
        this.takeDamage(0.5);
        console.log('Snowman punch damage - hearts:', this.hearts, 'gold hearts:', this.goldHearts);
        
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Set invincibility
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Knockback player
        const knockbackDir = player.x > snowman.x ? 1 : -1;
        player.setVelocityX(knockbackDir * 200);
        
        // Check for game over - restart level
        if (this.hearts <= 0) {
            this.scene.restart();
        }
        
        console.log('Snowman punches player!');
    }

    knockHatOff(snowman) {
        if (!snowman || !snowman.hasHat || !snowman.hatSprite) return;
        
        // Remove hat from snowman
        snowman.hasHat = false;
        
        // Get hat position before destroying sprite
        const hatX = snowman.hatSprite.x;
        const hatY = snowman.hatSprite.y;
        
        // Destroy the old hat sprite
        snowman.hatSprite.destroy();
        snowman.hatSprite = null;
        
        // Create physics body for hat that falls
        if (!this.textures.exists('topHat')) {
            this.createHatTexture();
        }
        const hat = this.physics.add.sprite(hatX, hatY, 'topHat');
        hat.setOrigin(0.5, 0.5);
        hat.setDepth(10);
        
        // Make sure hat is a dynamic body (not static) so it can fall
        hat.body.setCollideWorldBounds(false);
        hat.body.setGravityY(800); // Strong gravity to ensure it falls
        hat.body.setBounce(0.2);
        hat.body.setFriction(0.8); // Friction so it stops on ground
        
        // Give hat some velocity when knocked off
        hat.body.setVelocityX((Math.random() - 0.5) * 150);
        hat.body.setVelocityY(-30); // Small upward velocity initially
        
        // Add timestamp for pickup cooldown (3 seconds)
        hat.fallTime = this.time.now;
        hat.canPickup = false;
        hat.isFalling = true; // Track that hat is falling
        
        // Enable pickup after 3 seconds
        this.time.delayedCall(3000, () => {
            if (hat && hat.active) {
                hat.canPickup = true;
            }
        });
        
        // Add to hats group
        this.hats.add(hat);
        
        // Set up collision with ground/platforms - make sure it stops when it lands
        this.physics.add.collider(hat, this.platforms, (hat, platform) => {
            // Only stop hat if it's actually landing (moving downward and touching platform)
            if (hat.isFalling && hat.body.touching.down && hat.body.velocity.y >= 0) {
                // Hat has landed on platform
                hat.body.setVelocityY(0);
                hat.body.setVelocityX(hat.body.velocity.x * 0.5); // Slow down horizontal movement
                // Check if horizontal velocity is very small, then stop completely
                if (Math.abs(hat.body.velocity.x) < 10) {
                    hat.body.setVelocityX(0);
                    hat.isFalling = false; // Hat has landed
                }
            }
        });
        
        if (this.ground) {
            this.physics.add.collider(hat, this.ground, (hat, ground) => {
                // Stop hat when it hits ground (only if touching down)
                if (hat.isFalling && hat.body.touching.down) {
                    hat.body.setVelocityY(0);
                    hat.body.setVelocityX(hat.body.velocity.x * 0.5); // Slow down horizontal movement
                    // Check if horizontal velocity is very small, then stop completely
                    if (Math.abs(hat.body.velocity.x) < 10) {
                        hat.body.setVelocityX(0);
                        hat.isFalling = false; // Hat has landed
                    }
                }
            });
        }
        
        console.log('Hat knocked off!');
    }

    pickupHat(snowman, hat) {
        if (!snowman || !hat || !hat.active || snowman.hasHat || snowman.isDead) return;
        
        // Check if hat can be picked up (3 second cooldown after falling)
        if (!hat.canPickup) return;
        
        // Check if close enough to pick up (within 30 pixels)
        const dx = Math.abs(snowman.x - hat.x);
        const dy = Math.abs(snowman.y - hat.y);
        if (dx > 30 || dy > 40) return;
        
        // Snowman picks up the hat
        snowman.hasHat = true;
        
        // Create new hat sprite on snowman's head
        const hatSprite = this.add.sprite(snowman.x, snowman.y - 72, 'topHat'); // Above head position
        hatSprite.setOrigin(0.5, 1); // Anchor at bottom so it sits on head
        hatSprite.setDepth(10);
        snowman.hatSprite = hatSprite;
        
        // Destroy the fallen hat
        hat.destroy();
        
        // If this was the hat-wearer, mark it again
        if (snowman.isHatWearer) {
            console.log('Hat-wearer got his hat back!');
        } else {
            // Transfer hat-wearer status
            this.snowmen.getChildren().forEach(sm => {
                if (sm.isHatWearer) {
                    sm.isHatWearer = false;
                }
            });
            snowman.isHatWearer = true;
            console.log('New snowman got the hat!');
        }
    }

    killSnowman(snowman) {
        if (!snowman || snowman.isDead) return;
        
        // If this is the original hat-wearer, kill all snowmen
        // Use isOriginalHatWearer which never gets transferred to other snowmen
        if (snowman.isOriginalHatWearer) {
            console.log('Original hat-wearer killed! All snowmen die!');
            
            // Kill all snowmen and award points for the top hat snowman
            let snowmenKilled = 0;
            this.snowmen.getChildren().forEach(sm => {
                if (sm && sm.active && !sm.isDead) {
                    sm.isDead = true;
                    snowmenKilled++;
                    if (sm.hatSprite) {
                        sm.hatSprite.destroy();
                    }
                    this.time.delayedCall(100, () => {
                        if (sm && sm.active) {
                            sm.destroy();
                        }
                    });
                }
            });
            // Award 100 points for killing the top hat snowman
            this.points += 100;
            if (this.updatePointsDisplay) {
                this.updatePointsDisplay();
            }
            console.log('Top hat snowman killed! +100 points');
            return;
        }
        
        snowman.isDead = true;
        
        // Destroy hat if it exists
        if (snowman.hatSprite) {
            snowman.hatSprite.destroy();
        }
        
        // Award 50 points for killing the snowman
        this.points += 50;
        if (this.updatePointsDisplay) {
            this.updatePointsDisplay();
        }
        
        // Play death effect (could add particles later)
        console.log('Snowman killed! +50 points');
        
        // Destroy the snowman
        this.time.delayedCall(100, () => {
            if (snowman && snowman.active) {
                snowman.destroy();
            }
        });
    }

    createEnemy(x, y) {
        // Check if texture exists
        if (!this.textures.exists('whiteTurtle')) {
            console.error('White turtle texture does not exist! Creating it now...');
            this.createWhiteTurtleTexture();
        }
        
        // Create a white turtle enemy (no jumping in Level 2)
        try {
            const enemy = this.physics.add.sprite(x, y, 'whiteTurtle');
            enemy.setOrigin(0.5, 1); // Anchor at bottom center
            enemy.setCollideWorldBounds(false);
            
            // Enable gravity so turtle stays on platform
            enemy.body.setGravityY(800); // Same gravity as player
            
        // Enemy properties
        enemy.lastThrowTime = 0;
        enemy.throwCooldown = 2000; // Throw every 2 seconds (faster reload speed)
        enemy.throwRange = 1500; // Maximum distance to throw at player (farther range)
            // NO JUMPING - turtles stay on their platforms in Level 2
            enemy.canJump = false;
            
            // Add to enemies group
            this.enemies.add(enemy);
            
            console.log('White turtle enemy created at x:', x, 'y:', y);
        } catch (error) {
            console.error('Error creating enemy:', error);
        }
    }

    throwSnowball(enemy) {
        // Check if player exists
        if (!this.player || !this.player.active) {
            console.warn('Cannot throw snowball - player not available');
            return;
        }
        
        // Create a snowball projectile - spawn it above the enemy
        const spawnY = enemy.y - 25; // Higher up from enemy
        
        // Create snowball using proper texture
        if (!this.textures.exists('snowball')) {
            console.warn('Snowball texture not found, creating fallback');
            this.createSnowballTexture();
        }
        
        // Create as physics sprite so we can use setVelocity
        const snowball = this.physics.add.sprite(enemy.x, spawnY, 'snowball');
        snowball.setOrigin(0.5, 0.5);
        
        // Make sure snowball is active and visible
        snowball.setActive(true);
        snowball.setVisible(true);
        
        // Add to snowballs group FIRST before setting velocity
        if (this.snowballs) {
            this.snowballs.add(snowball);
        }
        
        // Enable gravity for snowball
        snowball.body.setGravityY(800); // Same gravity as world
        
        // Calculate direction to player with highly accurate prediction
        // Get player's current velocity
        const playerVelocityX = this.player.body ? this.player.body.velocity.x : 0;
        const playerVelocityY = this.player.body ? this.player.body.velocity.y : 0;
        
        // Calculate initial distance to player
        const initialDx = this.player.x - enemy.x;
        const initialDy = this.player.y - enemy.y;
        const initialDistance = Math.sqrt(initialDx * initialDx + initialDy * initialDy);
        
        if (initialDistance === 0) {
            console.warn('Player and enemy at same position, cannot calculate direction');
            snowball.destroy();
            return;
        }
        
        // Snowball speed (pixels per frame, assuming 60 FPS) - increased for better accuracy
        const throwSpeed = 500; // Faster snowball for better accuracy
        const fps = 60;
        const throwSpeedPerSecond = throwSpeed * fps; // Convert to pixels per second
        
        // Account for gravity in prediction - snowball will arc downward
        const gravity = 800; // Gravity per second
        const gravityPerFrame = gravity / fps;
        
        // More accurate iterative prediction with gravity consideration
        let predictedX = this.player.x;
        let predictedY = this.player.y;
        let timeToTarget = initialDistance / throwSpeedPerSecond;
        
        // Use more iterations for better accuracy (increased from 5 to 8)
        for (let i = 0; i < 8; i++) {
            // Predict player position at estimated arrival time
            // Account for player's velocity and potential acceleration
            predictedX = this.player.x + (playerVelocityX * timeToTarget);
            predictedY = this.player.y + (playerVelocityY * timeToTarget);
            
            // Account for gravity affecting snowball trajectory
            // The snowball will fall, so we need to aim slightly higher
            const gravityDrop = 0.5 * gravity * timeToTarget * timeToTarget;
            
            // Recalculate distance to predicted position (accounting for arc)
            const newDx = predictedX - enemy.x;
            const newDy = (predictedY - gravityDrop * 0.4) - enemy.y; // Better gravity compensation
            const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
            
            // Update time estimate based on new distance
            timeToTarget = newDistance / throwSpeedPerSecond;
        }
        
        // Final prediction with improved gravity compensation
        const finalGravityDrop = 0.5 * gravity * timeToTarget * timeToTarget;
        predictedX = this.player.x + (playerVelocityX * timeToTarget);
        predictedY = this.player.y + (playerVelocityY * timeToTarget) - (finalGravityDrop * 0.3);
        
        // Calculate final direction to predicted position
        const dx = predictedX - enemy.x;
        const dy = predictedY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            console.warn('Predicted position same as enemy position');
            snowball.destroy();
            return;
        }
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Use setVelocity (works on physics sprites)
        snowball.setVelocity(dirX * throwSpeed, dirY * throwSpeed);
        
        console.log('Snowball thrown by enemy at x:', enemy.x, 'y:', enemy.y, 'towards player at', this.player.x, this.player.y);
        console.log('Snowball velocity:', dirX * throwSpeed, dirY * throwSpeed);
    }

    createSnowBackground() {
        // Create enhanced snow-themed background with variety and atmosphere
        const worldWidth = 4000;
        const gameHeight = 600;
        
        // Store cloud containers for potential animation
        this.cloudContainers = [];
        
        // Create many more clouds across the level to cover the sky
        const cloudConfigs = [
            // Top layer clouds (cover upper sky)
            { x: 200, y: 50, size: 160, alpha: 0.8, color: 0xD0D0D0 },
            { x: 600, y: 60, size: 180, alpha: 0.75, color: 0xD5D5D5 },
            { x: 1000, y: 55, size: 170, alpha: 0.8, color: 0xD0D0D0 },
            { x: 1400, y: 65, size: 190, alpha: 0.78, color: 0xD3D3D3 },
            { x: 1800, y: 50, size: 200, alpha: 0.82, color: 0xCFCFCF },
            { x: 2200, y: 60, size: 175, alpha: 0.8, color: 0xD0D0D0 },
            { x: 2600, y: 55, size: 185, alpha: 0.78, color: 0xD2D2D2 },
            { x: 3000, y: 65, size: 195, alpha: 0.8, color: 0xD0D0D0 },
            { x: 3400, y: 58, size: 180, alpha: 0.75, color: 0xD5D5D5 },
            { x: 3800, y: 62, size: 190, alpha: 0.8, color: 0xD0D0D0 },
            
            // Middle layer clouds
            { x: 300, y: 120, size: 140, alpha: 0.7, color: 0xD8D8D8 },
            { x: 700, y: 110, size: 160, alpha: 0.72, color: 0xD6D6D6 },
            { x: 1100, y: 125, size: 150, alpha: 0.7, color: 0xD8D8D8 },
            { x: 1500, y: 115, size: 170, alpha: 0.75, color: 0xD5D5D5 },
            { x: 1900, y: 120, size: 145, alpha: 0.7, color: 0xD8D8D8 },
            { x: 2300, y: 110, size: 165, alpha: 0.73, color: 0xD7D7D7 },
            { x: 2700, y: 125, size: 155, alpha: 0.71, color: 0xD9D9D9 },
            { x: 3100, y: 118, size: 160, alpha: 0.72, color: 0xD6D6D6 },
            { x: 3500, y: 122, size: 150, alpha: 0.7, color: 0xD8D8D8 },
            
            // Lower layer clouds (more coverage)
            { x: 400, y: 180, size: 130, alpha: 0.65, color: 0xE0E0E0 },
            { x: 800, y: 175, size: 140, alpha: 0.68, color: 0xDDDDDD },
            { x: 1200, y: 185, size: 125, alpha: 0.65, color: 0xE0E0E0 },
            { x: 1600, y: 170, size: 145, alpha: 0.67, color: 0xDEDEDE },
            { x: 2000, y: 180, size: 135, alpha: 0.66, color: 0xDFDFDF },
            { x: 2400, y: 175, size: 140, alpha: 0.68, color: 0xDDDDDD },
            { x: 2800, y: 182, size: 130, alpha: 0.65, color: 0xE0E0E0 },
            { x: 3200, y: 178, size: 138, alpha: 0.67, color: 0xDEDEDE },
            { x: 3600, y: 180, size: 132, alpha: 0.66, color: 0xDFDFDF },
            
            // Additional scattered clouds for more coverage
            { x: 250, y: 200, size: 110, alpha: 0.6, color: 0xE5E5E5 },
            { x: 750, y: 195, size: 115, alpha: 0.62, color: 0xE3E3E3 },
            { x: 1250, y: 205, size: 108, alpha: 0.6, color: 0xE5E5E5 },
            { x: 1750, y: 198, size: 112, alpha: 0.61, color: 0xE4E4E4 },
            { x: 2250, y: 202, size: 110, alpha: 0.6, color: 0xE5E5E5 },
            { x: 2750, y: 195, size: 113, alpha: 0.61, color: 0xE4E4E4 },
            { x: 3250, y: 200, size: 109, alpha: 0.6, color: 0xE5E5E5 },
            { x: 3750, y: 197, size: 111, alpha: 0.61, color: 0xE4E4E4 }
        ];
        
        cloudConfigs.forEach((config, i) => {
            const cloudGroup = this.add.container(config.x, config.y);
            
            // Main cloud body (large circle)
            const mainCloud = this.add.circle(0, 0, config.size * 0.6, config.color);
            mainCloud.setAlpha(config.alpha);
            
            // Puffy cloud parts (smaller circles) - more varied
            const numParts = 4 + (i % 3); // 4-6 parts per cloud
            const parts = [mainCloud];
            
            for (let j = 0; j < numParts; j++) {
                const angle = (j / numParts) * Math.PI * 2;
                const distance = config.size * (0.3 + Math.random() * 0.2);
                const partSize = config.size * (0.25 + Math.random() * 0.15);
                const partX = Math.cos(angle) * distance;
                const partY = Math.sin(angle) * distance;
                
                const cloudPart = this.add.circle(partX, partY, partSize, config.color);
                cloudPart.setAlpha(config.alpha * (0.8 + Math.random() * 0.2));
                parts.push(cloudPart);
            }
            
            cloudGroup.add(parts);
            // Set clouds to be in front of the platform cloud (which is at -12)
            // Higher depth = renders in front, making platform cloud hard to see
            cloudGroup.setDepth(-8 - (i % 3)); // Vary depth slightly, in front of platform cloud
            cloudGroup.setScrollFactor(0.1, 0.1); // Slow parallax for distant feel
            this.cloudContainers.push(cloudGroup);
        });
        
        // Create enhanced snowflakes with variety and visual effects
        this.snowflakes = [];
        this.snowflakeSpeeds = [];
        this.snowflakeDrifts = [];
        this.snowflakeRotations = [];
        this.snowflakeTypes = []; // 0 = circle, 1 = star, 2 = hexagon
        
        // Helper function to create a star shape
        const createStar = (x, y, size) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xFFFFFF);
            const points = 6;
            const angleStep = (Math.PI * 2) / points;
            graphics.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = i * angleStep / 2;
                const radius = i % 2 === 0 ? size : size * 0.5;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();
            return graphics;
        };
        
        // Helper function to create a hexagon shape
        const createHexagon = (x, y, size) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xFFFFFF);
            const points = 6;
            const angleStep = (Math.PI * 2) / points;
            graphics.beginPath();
            for (let i = 0; i < points; i++) {
                const angle = i * angleStep;
                const px = x + Math.cos(angle) * size;
                const py = y + Math.sin(angle) * size;
                if (i === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();
            return graphics;
        };
        
        // Large detailed snowflakes (fewer, more visible, with shapes)
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, worldWidth);
            const y = Phaser.Math.Between(-100, 400);
            const size = 4 + Math.random() * 3;
            const type = Math.floor(Math.random() * 3);
            let flake;
            
            if (type === 0) {
                flake = this.add.circle(x, y, size, 0xFFFFFF);
            } else if (type === 1) {
                flake = createStar(x, y, size);
            } else {
                flake = createHexagon(x, y, size);
            }
            
            flake.setDepth(-5);
            flake.setAlpha(0.85 + Math.random() * 0.15);
            flake.setScrollFactor(0.12, 0.12);
            this.snowflakes.push(flake);
            this.snowflakeSpeeds.push(0.5 + Math.random() * 0.4);
            this.snowflakeDrifts.push(0.2 + Math.random() * 0.4);
            this.snowflakeRotations.push((Math.random() - 0.5) * 0.05);
            this.snowflakeTypes.push(type);
        }
        
        // Medium snowflakes (mix of shapes)
        for (let i = 0; i < 35; i++) {
            const x = Phaser.Math.Between(0, worldWidth);
            const y = Phaser.Math.Between(-50, 450);
            const size = 2.5 + Math.random() * 2;
            const type = Math.floor(Math.random() * 3);
            let flake;
            
            if (type === 0) {
                flake = this.add.circle(x, y, size, 0xFFFFFF);
            } else if (type === 1) {
                flake = createStar(x, y, size);
            } else {
                flake = createHexagon(x, y, size);
            }
            
            flake.setDepth(-6);
            flake.setAlpha(0.7 + Math.random() * 0.2);
            flake.setScrollFactor(0.18, 0.18);
            this.snowflakes.push(flake);
            this.snowflakeSpeeds.push(0.35 + Math.random() * 0.3);
            this.snowflakeDrifts.push(0.15 + Math.random() * 0.3);
            this.snowflakeRotations.push((Math.random() - 0.5) * 0.04);
            this.snowflakeTypes.push(type);
        }
        
        // Small snowflakes (many, subtle, mostly circles for performance)
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(0, worldWidth);
            const y = Phaser.Math.Between(0, 500);
            const size = 1 + Math.random() * 1.5;
            const type = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0; // 80% circles
            let flake;
            
            if (type === 0) {
                flake = this.add.circle(x, y, size, 0xFFFFFF);
            } else if (type === 1) {
                flake = createStar(x, y, size);
            } else {
                flake = createHexagon(x, y, size);
            }
            
            flake.setDepth(-7);
            flake.setAlpha(0.5 + Math.random() * 0.3);
            flake.setScrollFactor(0.22, 0.22);
            this.snowflakes.push(flake);
            this.snowflakeSpeeds.push(0.25 + Math.random() * 0.25);
            this.snowflakeDrifts.push(0.1 + Math.random() * 0.25);
            this.snowflakeRotations.push((Math.random() - 0.5) * 0.03);
            this.snowflakeTypes.push(type);
        }
        
        // Create wind effect particles (subtle)
        this.windParticles = [];
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, worldWidth),
                Phaser.Math.Between(100, 300),
                1,
                0xE8E8E8
            );
            particle.setDepth(-8);
            particle.setAlpha(0.4);
            particle.setScrollFactor(0.3, 0.3);
            this.windParticles.push(particle);
        }
        
        // Create distant atmospheric gradient effect
        const gradientGraphics = this.add.graphics();
        gradientGraphics.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xB0E0E6, 0xB0E0E6, 1);
        gradientGraphics.fillRect(0, 0, worldWidth, gameHeight);
        gradientGraphics.setDepth(-20);
        gradientGraphics.setAlpha(0.3);
        
        console.log('Enhanced snow background created!');
    }
    
    updateSnowflakes() {
        // Animate snowflakes with enhanced effects: rotation, twinkling, and wind
        if (this.snowflakes && this.snowflakeSpeeds) {
            this.snowflakes.forEach((flake, index) => {
                if (index < this.snowflakeSpeeds.length) {
                    // Move flake down at varied speed
                    flake.y += this.snowflakeSpeeds[index];
                    
                    // Horizontal drift with wind effect (varies by flake)
                    const windStrength = this.snowflakeDrifts[index] || 0.2;
                    const windPattern = Math.sin(this.time.now / 800 + index * 0.5) * windStrength;
                    flake.x += windPattern;
                    
                    // Rotation animation for non-circle snowflakes
                    if (this.snowflakeTypes && this.snowflakeTypes[index] !== 0) {
                        const rotationSpeed = this.snowflakeRotations[index] || 0.02;
                        flake.rotation += rotationSpeed;
                    }
                    
                    // Enhanced twinkling effect (sparkle animation)
                    const baseAlpha = this.snowflakeTypes && this.snowflakeTypes[index] === 0 ? 0.6 : 0.7;
                    const twinkleSpeed = 400 + index * 10; // Vary twinkle speed per flake
                    const twinkleAmount = 0.25 + Math.sin(this.time.now / twinkleSpeed + index) * 0.2;
                    flake.setAlpha(baseAlpha + twinkleAmount);
                    
                    // Scale pulsing for larger snowflakes (subtle)
                    if (index < 20) { // Large snowflakes
                        const scalePulse = 1 + Math.sin(this.time.now / 1000 + index) * 0.1;
                        flake.setScale(scalePulse);
                    }
                    
                    // Reset flake if it goes off screen
                    if (flake.y > 650) {
                        flake.y = -50;
                        flake.x = Phaser.Math.Between(0, 4000);
                        // Reset rotation for shaped flakes
                        if (this.snowflakeTypes && this.snowflakeTypes[index] !== 0) {
                            flake.rotation = Math.random() * Math.PI * 2;
                        }
                    }
                    
                    // Wrap horizontally for continuous effect
                    if (flake.x < -50) {
                        flake.x = 4050;
                    } else if (flake.x > 4050) {
                        flake.x = -50;
                    }
                }
            });
        }
        
        // Animate wind particles
        if (this.windParticles) {
            this.windParticles.forEach((particle, index) => {
                // Wind particles move horizontally with slight vertical movement
                particle.x += 0.5 + Math.sin(this.time.now / 600 + index) * 0.3;
                particle.y += 0.1 + Math.cos(this.time.now / 800 + index) * 0.1;
                
                // Fade in/out for atmospheric effect
                particle.setAlpha(0.2 + Math.sin(this.time.now / 400 + index) * 0.2);
                
                // Reset if off screen
                if (particle.x > 4050) {
                    particle.x = -50;
                    particle.y = Phaser.Math.Between(100, 300);
                }
            });
        }
        
        // Subtle cloud movement (very slow drift)
        if (this.cloudContainers) {
            this.cloudContainers.forEach((cloud, index) => {
                // Very slow horizontal drift
                cloud.x += 0.02 + (index % 3) * 0.01;
                
                // Slight vertical bob
                cloud.y += Math.sin(this.time.now / 3000 + index) * 0.05;
                
                // Wrap clouds for continuous effect
                if (cloud.x > 4200) {
                    cloud.x = -200;
                }
            });
        }
    }
    
    addIceStrip(centerX, topY, width) {
        // Add a detailed snow strip along the top of a platform with texture
        const snowWhite = 0xFFFFFF; // Pure white snow
        const lightSnow = 0xF8F8F8; // Very light gray-white
        const shadowSnow = 0xE8E8E8; // Slightly darker for shadows
        const stripHeight = 8; // Height of snow strip
        
        // Position it at the top edge of the platform
        const stripY = topY - stripHeight / 2;
        
        // Base snow layer
        const baseStrip = this.add.rectangle(centerX, stripY, width, stripHeight, snowWhite);
        baseStrip.setDepth(1);
        
        // Add texture variations for depth
        if (width > 30) {
            // Add subtle shadow patches
            const numShadows = Math.floor(width / 45);
            for (let i = 0; i < numShadows; i++) {
                const shadowX = centerX - width/2 + (i * 45) + Math.random() * 25;
                const shadowWidth = 8 + Math.random() * 6;
                const shadow = this.add.rectangle(
                    shadowX,
                    stripY + 1,
                    shadowWidth,
                    stripHeight - 2,
                    shadowSnow
                );
                shadow.setDepth(1);
                shadow.setAlpha(0.5);
            }
            
            // Add light highlights for depth
            const numHighlights = Math.floor(width / 50);
            for (let i = 0; i < numHighlights; i++) {
                const highlightX = centerX - width/2 + (i * 50) + Math.random() * 30;
                const highlightWidth = 6 + Math.random() * 5;
                const highlight = this.add.rectangle(
                    highlightX,
                    stripY - 1,
                    highlightWidth,
                    stripHeight - 2,
                    lightSnow
                );
                highlight.setDepth(1);
                highlight.setAlpha(0.6);
            }
            
            // Add sparkle dots for snow effect
            const numSparkles = Math.floor(width / 35);
            for (let i = 0; i < numSparkles; i++) {
                if (Math.random() > 0.7) { // 30% chance
                    const sparkleX = centerX - width/2 + (i * 35) + Math.random() * 20;
                    const sparkle = this.add.circle(
                        sparkleX,
                        stripY,
                        1.5,
                        0xFFFFFF
                    );
                    sparkle.setDepth(1);
                    sparkle.setAlpha(0.9);
                }
            }
            
            // Add small snow accumulation bumps
            const numBumps = Math.floor(width / 60);
            for (let i = 0; i < numBumps; i++) {
                if (Math.random() > 0.6) { // 40% chance
                    const bumpX = centerX - width/2 + (i * 60) + Math.random() * 30;
                    const bumpSize = 2 + Math.random() * 2;
                    const bump = this.add.circle(
                        bumpX,
                        stripY - 1,
                        bumpSize,
                        0xFFFFFF
                    );
                    bump.setDepth(1);
                    bump.setAlpha(0.7);
                }
            }
        }
    }
    
    createSnowTopEdge(centerX, topY, width) {
        // Create an irregular, wavy top edge for the ground using snowflake-like shapes
        // Similar to the falling snowflakes in the background
        const baseY = topY;
        
        // Helper function to create star shape (like background snowflakes)
        const createStar = (x, y, size) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xFFFFFF, 1);
            const spikes = 6;
            const outerRadius = size;
            const innerRadius = size * 0.5;
            graphics.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();
            return graphics;
        };
        
        // Helper function to create hexagon shape (like background snowflakes)
        const createHexagon = (x, y, size) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xFFFFFF, 1);
            graphics.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const px = x + Math.cos(angle) * size;
                const py = y + Math.sin(angle) * size;
                if (i === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();
            return graphics;
        };
        
        // Create irregular top edge with snowflake-like shapes
        const segmentWidth = 25; // Width of each segment
        const numSegments = Math.ceil(width / segmentWidth);
        
        // Draw irregular top edge with snow accumulation mounds
        for (let i = 0; i < numSegments; i++) {
            const segmentX = centerX - width/2 + (i * segmentWidth);
            
            // Random height variation for each segment (snow accumulation)
            const heightVariation = Math.random() * 10 - 5; // -5 to +5 pixels
            const segmentTopY = baseY - heightVariation;
            
            // Draw a small snow mound/segment using ellipse
            const moundWidth = segmentWidth + Math.random() * 8;
            const moundHeight = 4 + Math.random() * 5;
            
            const moundGraphics = this.add.graphics();
            moundGraphics.fillStyle(0xFFFFFF, 1.0); // Fully opaque
            moundGraphics.fillEllipse(
                segmentX + segmentWidth/2,
                segmentTopY - moundHeight/2,
                moundWidth,
                moundHeight
            );
            moundGraphics.setDepth(10); // Above player to cover feet
            
            // Add snowflake-like shapes on top (like the falling ones)
            if (Math.random() > 0.75) { // 25% chance
                const flakeX = segmentX + segmentWidth/2 + (Math.random() * 12 - 6);
                const flakeY = segmentTopY - moundHeight;
                const flakeSize = 2 + Math.random() * 3;
                const flakeType = Math.floor(Math.random() * 3);
                
                let flake;
                if (flakeType === 0) {
                    // Circle snowflake
                    flake = this.add.circle(flakeX, flakeY, flakeSize, 0xFFFFFF);
                } else if (flakeType === 1) {
                    // Star snowflake
                    flake = createStar(flakeX, flakeY, flakeSize);
                } else {
                    // Hexagon snowflake
                    flake = createHexagon(flakeX, flakeY, flakeSize);
                }
                
                flake.setDepth(10); // Above player to cover feet
                flake.setAlpha(1.0); // Fully opaque
            }
        }
        
        // Add some larger snow accumulations randomly
        const numLargeMounds = Math.floor(width / 120);
        for (let i = 0; i < numLargeMounds; i++) {
            const moundX = centerX - width/2 + (i * 120) + Math.random() * 60;
            const moundHeight = 6 + Math.random() * 7;
            const moundWidth = 25 + Math.random() * 20;
            
            const largeMound = this.add.graphics();
            largeMound.fillStyle(0xFFFFFF, 1.0); // Fully opaque
            largeMound.fillEllipse(
                moundX,
                baseY - moundHeight/2,
                moundWidth,
                moundHeight
            );
            largeMound.setDepth(10); // Above player to cover feet
        }
        
        // Add a thin base layer just to ensure coverage, but keep it subtle
        // Don't make it a flat line - let the texture show through
        const baseSnowLayer = this.add.rectangle(
            centerX,
            baseY + 2, // Slightly below the texture
            width,
            8,
            0xFFFFFF
        );
        baseSnowLayer.setDepth(9); // Below texture but above player
        
        // Add sparkle dots on the snow texture (on top of mounds)
        const numSparkles = Math.floor(width / 20);
        for (let i = 0; i < numSparkles; i++) {
            if (Math.random() > 0.7) {
                const sparkleX = centerX - width/2 + (i * 20) + Math.random() * 15;
                const sparkle = this.add.circle(
                    sparkleX,
                    baseY - 2, // Adjusted for lowered snow
                    1.5 + Math.random(),
                    0xFFFFFF
                );
                sparkle.setDepth(11); // Above everything
                sparkle.setAlpha(1.0); // Fully opaque
            }
        }
    }
    
    addPlatformDetail(centerX, centerY, width, height) {
        // Add detailed texture to the platform body itself
        const numDetails = Math.floor(width / 60);
        
        for (let i = 0; i < numDetails; i++) {
            const detailX = centerX - width/2 + (i * 60) + Math.random() * 30;
            
            // Add subtle shadow patches
            if (Math.random() > 0.5) {
                const shadow = this.add.rectangle(
                    detailX,
                    centerY,
                    12 + Math.random() * 8,
                    height - 2,
                    0xD0D0D0 // Slightly darker
                );
                shadow.setDepth(0);
                shadow.setAlpha(0.3);
            }
            
            // Add light highlights
            if (Math.random() > 0.6) {
                const highlight = this.add.rectangle(
                    detailX + (Math.random() * 20 - 10),
                    centerY - 2,
                    6 + Math.random() * 4,
                    height - 4,
                    0xF0F0F0 // Slightly lighter
                );
                highlight.setDepth(0);
                highlight.setAlpha(0.4);
            }
        }
        
        // Add edge highlights for 3D effect
        const leftEdge = this.add.rectangle(
            centerX - width/2 + 1,
            centerY,
            2,
            height,
            0xF5F5F5
        );
        leftEdge.setDepth(0);
        leftEdge.setAlpha(0.5);
        
        const rightEdge = this.add.rectangle(
            centerX + width/2 - 1,
            centerY,
            2,
            height,
            0xF5F5F5
        );
        rightEdge.setDepth(0);
        rightEdge.setAlpha(0.5);
    }
    
    addGroundDetail(centerX, topY, width, height) {
        // Add detailed snow texture to the ground - enhanced with more variety
        const groundCenterY = topY + height / 2;
        
        // Add more texture layers throughout the ground height
        const numLayers = Math.floor(height / 8); // More layers for more detail
        for (let layer = 0; layer < numLayers; layer++) {
            const layerY = topY + (layer * 8) + 4;
            const layerDepth = layer / numLayers;
            
            // Subtle shadow patches for depth - more frequent
            if (layerDepth > 0.3) {
                const numShadows = Math.floor(width / 60); // More shadows
                for (let i = 0; i < numShadows; i++) {
                    const shadowX = centerX - width/2 + (i * 60) + Math.random() * 30;
                    const shadow = this.add.rectangle(
                        shadowX,
                        layerY,
                        15 + Math.random() * 12,
                        4 + Math.random() * 3,
                        0xF0F0F0 // Light gray
                    );
                    shadow.setDepth(0);
                    shadow.setAlpha(1.0);
                }
            }
            
            // Light snow texture variations - more frequent
            const numTextures = Math.floor(width / 50);
            for (let i = 0; i < numTextures; i++) {
                if (Math.random() > 0.4) { // 60% chance
                    const textureX = centerX - width/2 + (i * 50) + Math.random() * 25;
                    const texture = this.add.rectangle(
                        textureX,
                        layerY,
                        10 + Math.random() * 8,
                        3 + Math.random() * 2,
                        0xFFFFFF // Pure white
                    );
                    texture.setDepth(0);
                    texture.setAlpha(1.0);
                }
            }
            
            // Add medium-sized texture patches
            if (Math.random() > 0.7) {
                const patchX = centerX - width/2 + Math.random() * width;
                const patch = this.add.rectangle(
                    patchX,
                    layerY,
                    20 + Math.random() * 15,
                    5 + Math.random() * 3,
                    0xF8F8F8 // Very light gray
                );
                patch.setDepth(0);
                patch.setAlpha(1.0);
            }
        }
        
        // Add more snow accumulation mounds/bumps
        const numMounds = Math.floor(width / 80); // More mounds
        for (let i = 0; i < numMounds; i++) {
            const moundX = centerX - width/2 + (i * 80) + Math.random() * 40;
            const moundY = topY + Math.random() * height;
            const moundSize = 6 + Math.random() * 8;
            
            const moundGraphics = this.add.graphics();
            moundGraphics.fillStyle(0xFFFFFF, 1.0);
            moundGraphics.fillEllipse(
                moundX,
                moundY,
                moundSize * 2,
                moundSize
            );
            moundGraphics.setDepth(0);
        }
        
        // Add scattered snow sparkles/dots - more of them
        const numDots = Math.floor((width * height) / 150); // More dots
        for (let i = 0; i < numDots; i++) {
            const dotX = centerX - width/2 + Math.random() * width;
            const dotY = topY + Math.random() * height;
            const dotSize = 1.5 + Math.random() * 2;
            const dot = this.add.circle(
                dotX,
                dotY,
                dotSize,
                0xFFFFFF
            );
            dot.setDepth(0);
            dot.setAlpha(1.0);
        }
        
        // Add larger snowflakes for texture - more of them
        const numFlakes = Math.floor(width / 100);
        for (let i = 0; i < numFlakes; i++) {
            if (Math.random() > 0.6) { // 40% chance
                const flakeX = centerX - width/2 + (i * 100) + Math.random() * 50;
                const flakeY = topY + Math.random() * height;
                const flakeSize = 2 + Math.random() * 3;
                const flake = this.add.circle(
                    flakeX,
                    flakeY,
                    flakeSize,
                    0xFFFFFF
                );
                flake.setDepth(0);
                flake.setAlpha(1.0);
            }
        }
        
        // Add some irregular patches for more variation
        const numPatches = Math.floor(width / 200);
        for (let i = 0; i < numPatches; i++) {
            const patchX = centerX - width/2 + (i * 200) + Math.random() * 100;
            const patchY = topY + Math.random() * height;
            const patchWidth = 30 + Math.random() * 20;
            const patchHeight = 8 + Math.random() * 5;
            const patchGraphics = this.add.graphics();
            patchGraphics.fillStyle(0xF5F5F5, 1.0);
            patchGraphics.fillEllipse(
                patchX,
                patchY,
                patchWidth,
                patchHeight
            );
            patchGraphics.setDepth(0);
        }
    }

    addSnow(centerX, topY, width) {
        // Legacy function - redirect to addIceStrip for consistency
        this.addIceStrip(centerX, topY, width);
        // Add highly detailed snowy white texture on top of platforms/ground
        const snowColor = 0xFFFFFF; // Pure white
        const snowHeight = 10; // Slightly taller for more detail
        const snowY = topY - snowHeight / 2;
        
        // Base snow layer with subtle gradient
        const baseSnow = this.add.rectangle(centerX, snowY, width, snowHeight, 0xFEFEFE);
        baseSnow.setDepth(1);
        
        // Main snow layer
        const snow = this.add.rectangle(centerX, snowY, width, snowHeight, snowColor);
        snow.setDepth(1);
        snow.setAlpha(0.95);
        
        // Add detailed texture variation for depth and realism
        if (width > 40) {
            // Layer 1: Deeper shadow patches for texture
            const numShadows = Math.floor(width / 45);
            for (let i = 0; i < numShadows; i++) {
                const shadowX = centerX - width/2 + (i * 45) + Math.random() * 25;
                const shadowWidth = 10 + Math.random() * 10;
                const shadow = this.add.rectangle(
                    shadowX,
                    snowY + 1,
                    shadowWidth,
                    snowHeight - 2,
                    0xE8E8E8 // Darker shadow
                );
                shadow.setDepth(1);
                shadow.setAlpha(0.5);
            }
            
            // Layer 2: Medium depth patches
            const numPatches = Math.floor(width / 60);
            for (let i = 0; i < numPatches; i++) {
                const patchX = centerX - width/2 + (i * 60) + Math.random() * 35;
                const patchWidth = 14 + Math.random() * 12;
                const patch = this.add.rectangle(
                    patchX,
                    snowY,
                    patchWidth,
                    snowHeight - 1,
                    0xF0F0F0 // Medium shadow
                );
                patch.setDepth(1);
                patch.setAlpha(0.4);
            }
            
            // Layer 3: Light texture variations
            const numTextures = Math.floor(width / 40);
            for (let i = 0; i < numTextures; i++) {
                const textureX = centerX - width/2 + (i * 40) + Math.random() * 20;
                const textureWidth = 8 + Math.random() * 6;
                const texture = this.add.rectangle(
                    textureX,
                    snowY - 0.5,
                    textureWidth,
                    snowHeight - 0.5,
                    0xF8F8F8 // Light variation
                );
                texture.setDepth(1);
                texture.setAlpha(0.3);
            }
            
            // Bright highlights for sparkle and shine
            const numHighlights = Math.floor(width / 70);
            for (let i = 0; i < numHighlights; i++) {
                const highlightX = centerX - width/2 + (i * 70) + Math.random() * 45;
                const highlightSize = 4 + Math.random() * 4;
                const highlight = this.add.circle(
                    highlightX,
                    snowY - 2,
                    highlightSize,
                    0xFFFFFF // Bright white highlight
                );
                highlight.setDepth(1);
                highlight.setAlpha(0.7);
                
                // Add smaller sparkle dots
                if (Math.random() > 0.5) {
                    const sparkle = this.add.circle(
                        highlightX + (Math.random() * 8 - 4),
                        snowY - 1,
                        2,
                        0xFFFFFF
                    );
                    sparkle.setDepth(1);
                    sparkle.setAlpha(0.8);
                }
            }
            
            // Snow accumulation bumps and mounds
            const numBumps = Math.floor(width / 85);
            for (let i = 0; i < numBumps; i++) {
                const bumpX = centerX - width/2 + (i * 85) + Math.random() * 50;
                const bumpSize = 5 + Math.random() * 4;
                const bumpHeight = 2 + Math.random() * 2;
                
                // Main bump using graphics for ellipse shape
                const bumpGraphics = this.add.graphics();
                bumpGraphics.fillStyle(0xFAFAFA, 0.6);
                bumpGraphics.fillEllipse(
                    bumpX,
                    snowY - bumpHeight/2,
                    bumpSize * 2,
                    bumpSize + bumpHeight
                );
                bumpGraphics.setDepth(1);
                
                // Highlight on top of bump
                const bumpHighlight = this.add.circle(
                    bumpX,
                    snowY - bumpHeight - 1,
                    bumpSize * 0.6,
                    0xFFFFFF
                );
                bumpHighlight.setDepth(1);
                bumpHighlight.setAlpha(0.5);
            }
            
            // Edge highlights for 3D effect
            const edgeHighlight1 = this.add.rectangle(
                centerX - width/2 + 2,
                snowY - 2,
                3,
                snowHeight - 2,
                0xFFFFFF
            );
            edgeHighlight1.setDepth(1);
            edgeHighlight1.setAlpha(0.4);
            
            const edgeHighlight2 = this.add.rectangle(
                centerX + width/2 - 2,
                snowY - 2,
                3,
                snowHeight - 2,
                0xFFFFFF
            );
            edgeHighlight2.setDepth(1);
            edgeHighlight2.setAlpha(0.4);
            
            // Small random snow crystals/dots for extra detail
            const numCrystals = Math.floor(width / 25);
            for (let i = 0; i < numCrystals; i++) {
                if (Math.random() > 0.7) { // 30% chance
                    const crystalX = centerX - width/2 + (i * 25) + Math.random() * 15;
                    const crystal = this.add.circle(
                        crystalX,
                        snowY + (Math.random() * 2 - 1),
                        1.5,
                        0xFFFFFF
                    );
                    crystal.setDepth(1);
                    crystal.setAlpha(0.6);
                }
            }
        }
    }
    
    addGroundDetail(centerX, topY, width, height) {
        // Add detailed texture throughout the entire height of the ground
        const groundCenterY = topY + height / 2;
        
        // Create multiple layers of detail throughout the ground height
        const numLayers = Math.floor(height / 8); // One layer every 8 pixels
        
        for (let layer = 0; layer < numLayers; layer++) {
            const layerY = topY + (layer * 8) + 4; // Position of this layer
            const layerDepth = layer / numLayers; // 0 at top, 1 at bottom
            
            // Layer 1: Shadow patches (more at bottom, less at top)
            if (layerDepth > 0.2) { // Start shadows after top 20%
                const numShadows = Math.floor(width / (80 - layerDepth * 20));
                for (let i = 0; i < numShadows; i++) {
                    const shadowX = centerX - width/2 + (i * (80 - layerDepth * 20)) + Math.random() * 30;
                    const shadowWidth = 12 + Math.random() * 15;
                    const shadowHeight = 4 + Math.random() * 3;
                    const shadow = this.add.rectangle(
                        shadowX,
                        layerY,
                        shadowWidth,
                        shadowHeight,
                        0xE5E5E5 // Darker shadow
                    );
                    shadow.setDepth(0);
                    shadow.setAlpha(0.3 + layerDepth * 0.2); // Darker towards bottom
                }
            }
            
            // Layer 2: Medium texture patches
            const numPatches = Math.floor(width / (60 - layerDepth * 15));
            for (let i = 0; i < numPatches; i++) {
                const patchX = centerX - width/2 + (i * (60 - layerDepth * 15)) + Math.random() * 25;
                const patchWidth = 10 + Math.random() * 12;
                const patchHeight = 3 + Math.random() * 2;
                const patch = this.add.rectangle(
                    patchX,
                    layerY,
                    patchWidth,
                    patchHeight,
                    0xEDEDED // Medium shadow
                );
                patch.setDepth(0);
                patch.setAlpha(0.25 + layerDepth * 0.15);
            }
            
            // Layer 3: Light texture variations
            const numTextures = Math.floor(width / (50 - layerDepth * 10));
            for (let i = 0; i < numTextures; i++) {
                const textureX = centerX - width/2 + (i * (50 - layerDepth * 10)) + Math.random() * 20;
                const textureWidth = 8 + Math.random() * 8;
                const textureHeight = 2 + Math.random() * 2;
                const texture = this.add.rectangle(
                    textureX,
                    layerY,
                    textureWidth,
                    textureHeight,
                    0xF5F5F5 // Light variation
                );
                texture.setDepth(0);
                texture.setAlpha(0.2 + layerDepth * 0.1);
            }
            
            // Add some vertical streaks for depth (especially in middle/bottom)
            if (layerDepth > 0.3 && Math.random() > 0.7) {
                const streakX = centerX - width/2 + Math.random() * width;
                const streakHeight = 6 + Math.random() * 4;
                const streak = this.add.rectangle(
                    streakX,
                    layerY,
                    3,
                    streakHeight,
                    0xE8E8E8
                );
                streak.setDepth(0);
                streak.setAlpha(0.4);
            }
        }
        
        // Add larger detail elements in the middle and bottom sections
        const middleStartY = topY + height * 0.3;
        const bottomStartY = topY + height * 0.6;
        
        // Middle section details
        const middleDetails = Math.floor(width / 100);
        for (let i = 0; i < middleDetails; i++) {
            const detailX = centerX - width/2 + (i * 100) + Math.random() * 60;
            const detailY = middleStartY + Math.random() * (height * 0.3);
            
            // Medium-sized texture patches
            const detailWidth = 20 + Math.random() * 25;
            const detailHeight = 5 + Math.random() * 4;
            const detail = this.add.rectangle(
                detailX,
                detailY,
                detailWidth,
                detailHeight,
                0xEBEBEB
            );
            detail.setDepth(0);
            detail.setAlpha(0.35);
            
            // Add some smaller highlights
            if (Math.random() > 0.6) {
                const highlight = this.add.circle(
                    detailX + (Math.random() * detailWidth - detailWidth/2),
                    detailY,
                    3 + Math.random() * 2,
                    0xF8F8F8
                );
                highlight.setDepth(0);
                highlight.setAlpha(0.4);
            }
        }
        
        // Bottom section details (more prominent)
        const bottomDetails = Math.floor(width / 80);
        for (let i = 0; i < bottomDetails; i++) {
            const detailX = centerX - width/2 + (i * 80) + Math.random() * 50;
            const detailY = bottomStartY + Math.random() * (height * 0.4);
            
            // Larger texture patches for bottom
            const detailWidth = 25 + Math.random() * 30;
            const detailHeight = 6 + Math.random() * 5;
            const detail = this.add.rectangle(
                detailX,
                detailY,
                detailWidth,
                detailHeight,
                0xE0E0E0 // Darker for bottom
            );
            detail.setDepth(0);
            detail.setAlpha(0.4);
            
            // Add depth with darker patches
            if (Math.random() > 0.5) {
                const darkPatch = this.add.rectangle(
                    detailX + (Math.random() * detailWidth - detailWidth/2),
                    detailY,
                    detailWidth * 0.6,
                    detailHeight * 0.7,
                    0xD8D8D8
                );
                darkPatch.setDepth(0);
                darkPatch.setAlpha(0.3);
            }
        }
        
        // Add some random scattered detail dots throughout
        const numDots = Math.floor((width * height) / 200);
        for (let i = 0; i < numDots; i++) {
            const dotX = centerX - width/2 + Math.random() * width;
            const dotY = topY + Math.random() * height;
            const dotSize = 1.5 + Math.random() * 1.5;
            const dot = this.add.circle(
                dotX,
                dotY,
                dotSize,
                0xF0F0F0
            );
            dot.setDepth(0);
            dot.setAlpha(0.5);
        }
    }
    
    addIcicles(platformX, platformY, platformWidth) {
        // Add icicles hanging from the bottom of a platform
        const platformBottom = platformY + 10; // Bottom edge of platform
        const numIcicles = Math.floor(platformWidth / 40); // One icicle every 40 pixels
        
        for (let i = 0; i < numIcicles; i++) {
            const icicleX = platformX - platformWidth/2 + (i * 40) + 20 + (Math.random() * 10 - 5);
            const icicleLength = 15 + Math.random() * 20; // Varying lengths
            const icicleWidth = 3 + Math.random() * 2; // Varying widths
            
            // Create icicle as a triangle using graphics
            const graphics = this.add.graphics();
            graphics.fillStyle(0xB0E0E6, 0.9); // Light blue-white color for ice
            
            // Draw triangle pointing down - wide at top (attached to platform), narrow point at bottom
            const attachY = platformBottom; // Where icicle attaches to platform
            const pointY = platformBottom + icicleLength; // Bottom point of icicle
            graphics.fillTriangle(
                icicleX, pointY, // Bottom point (narrow, pointing down)
                icicleX - icicleWidth/2, attachY, // Top left (wide, attached to platform)
                icicleX + icicleWidth/2, attachY  // Top right (wide, attached to platform)
            );
            
            graphics.setDepth(2); // Above platforms but below player
        }
    }

    createFinishFlag(finishX, platformY) {
        const poleHeight = 120;
        const poleBaseY = platformY;
        const poleTopY = poleBaseY - poleHeight;
        
        const pole = this.add.rectangle(finishX, poleBaseY - poleHeight/2, 12, poleHeight, 0x654321);
        this.physics.add.existing(pole, true);
        
        const flagWidth = 100;
        const flagHeight = 60;
        const checkerSize = 10;
        
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
        
        const flag = this.add.image(finishX + 6, poleTopY, 'checkeredFlag');
        flag.setOrigin(0, 0.5);
        
        // Make finish zone smaller so player must be on the platform to win
        // Position zone on top of platform, not centered on platformY
        const platformHeight = 20; // Standard platform height
        const finishZoneY = platformY - platformHeight / 2 - 10; // Position above platform center
        const finishZone = this.add.rectangle(finishX, finishZoneY, 100, 30, 0xFFD700, 0.3);
        this.physics.add.existing(finishZone, true);
        finishZone.setOrigin(0.5, 0.5);
        finishZone.setStrokeStyle(2, 0xFFD700);
        
        if (finishZone.body) {
            finishZone.body.setSize(100, 30); // Smaller zone - must be on platform
            finishZone.body.setOffset(0, 0);
        }
        
        // Store platform Y for validation in reachFinish
        finishZone.platformY = platformY;
        this.finishZone = finishZone;
        this.physics.add.overlap(this.player, finishZone, this.reachFinish, null, this);
    }

    createHeartsDisplay() {
        // Create hearts display in top right corner
        this.heartsGroup = this.add.group();
        this.updateHeartsDisplay();
    }

    updateHeartsDisplay() {
        // Clear existing hearts
        this.heartsGroup.clear(true, true);
        
        // Heart size and spacing (same as Level 1)
        const heartSize = 30;
        const heartSpacing = 35;
        const startX = 750; // Right side of screen
        const startY = 30; // Top of screen
        
        // Calculate full hearts and check for half heart
        const fullHearts = Math.floor(this.hearts);
        const hasHalfHeart = this.hearts % 1 >= 0.5; // Check if there's a half heart remaining
        const totalHeartsToShow = fullHearts + (hasHalfHeart ? 1 : 0);
        
        // Display full hearts
        for (let i = 0; i < fullHearts; i++) {
            const heartX = startX - (totalHeartsToShow - i - 1) * heartSpacing;
            const heart = this.add.rectangle(heartX, startY, heartSize, heartSize, 0xFF0000); // Red
            heart.setStrokeStyle(2, 0xFFFFFF); // White border
            heart.setScrollFactor(0, 0); // Fixed to camera (stays in top right)
            heart.setDepth(1000);
            this.heartsGroup.add(heart);
        }
        
        // Display half heart if there's a remainder - show as a half-filled rectangle
        if (hasHalfHeart) {
            const halfHeartX = startX - (totalHeartsToShow - fullHearts - 1) * heartSpacing;
            // Create a full rectangle outline
            const halfHeartOutline = this.add.rectangle(halfHeartX, startY, heartSize, heartSize, 0x000000, 0); // Transparent
            halfHeartOutline.setStrokeStyle(2, 0xFFFFFF); // White border
            halfHeartOutline.setScrollFactor(0, 0);
            halfHeartOutline.setDepth(1000);
            this.heartsGroup.add(halfHeartOutline);
            
            // Fill only the left half with red
            const halfHeartFill = this.add.rectangle(
                halfHeartX - heartSize/4, 
                startY, 
                heartSize/2, 
                heartSize, 
                0xFF0000
            ); // Red, left half only
            halfHeartFill.setScrollFactor(0, 0);
            halfHeartFill.setDepth(1001);
            this.heartsGroup.add(halfHeartFill);
        }
        
        // Display gold hearts after regular hearts
        if (this.goldHearts > 0) {
            const goldHeartStartX = startX - (totalHeartsToShow * heartSpacing);
            const fullGoldHearts = Math.floor(this.goldHearts);
            const hasHalfGoldHeart = this.goldHearts % 1 >= 0.5;
            
            // Display full gold hearts
            for (let i = 0; i < fullGoldHearts; i++) {
                const goldHeartX = goldHeartStartX - i * heartSpacing;
                const goldHeart = this.add.rectangle(goldHeartX, startY, heartSize, heartSize, 0xFFD700); // Gold color
                goldHeart.setStrokeStyle(2, 0xFFFFFF); // White border
                goldHeart.setScrollFactor(0, 0); // Fixed to camera
                goldHeart.setDepth(1000);
                this.heartsGroup.add(goldHeart);
            }
            
            // Display half gold heart if there's a remainder
            if (hasHalfGoldHeart) {
                const halfGoldHeartX = goldHeartStartX - fullGoldHearts * heartSpacing;
                // Create a full rectangle outline
                const halfGoldHeartOutline = this.add.rectangle(halfGoldHeartX, startY, heartSize, heartSize, 0x000000, 0); // Transparent
                halfGoldHeartOutline.setStrokeStyle(2, 0xFFFFFF); // White border
                halfGoldHeartOutline.setScrollFactor(0, 0);
                halfGoldHeartOutline.setDepth(1000);
                this.heartsGroup.add(halfGoldHeartOutline);
                
                // Fill only the left half with gold
                const halfGoldHeartFill = this.add.rectangle(
                    halfGoldHeartX - heartSize/4, 
                    startY, 
                    heartSize/2, 
                    heartSize, 
                    0xFFD700
                ); // Gold, left half only
                halfGoldHeartFill.setScrollFactor(0, 0);
                halfGoldHeartFill.setDepth(1001);
                this.heartsGroup.add(halfGoldHeartFill);
            }
        }
    }

    createPointsDisplay() {
        this.pointsText = this.add.text(10, 10, 'Points: 0', {
            fontSize: '24px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        });
        this.pointsText.setScrollFactor(0);
        this.pointsText.setDepth(1000);
    }

    updatePointsDisplay() {
        if (this.pointsText) {
            this.pointsText.setText('Points: ' + this.points);
        }
    }

    reachFinish(player, finishZone) {
        if (this.levelCompleted) {
            return;
        }
        
        // Only complete if player is on top of the platform, not below it
        // Check if player's bottom is above the platform top
        const platformY = finishZone.platformY || finishZone.y;
        const platformHeight = 20;
        const platformTop = platformY - platformHeight / 2;
        
        // Player must be on top of platform (player's bottom should be at or above platform top)
        // Also check that player is not jumping up from below (velocity should not be strongly upward)
        if (player.y >= platformTop + 10 || player.body.velocity.y > 50) {
            // Player is below platform or jumping up from below - don't complete
            return;
        }
        
        this.levelCompleted = true;
        this.player.setVelocityX(0);
        this.player.setVelocityY(0);
        
        const screenX = 400;
        const screenY = 300;
        
        const bgRect = this.add.rectangle(screenX, screenY, 600, 300, 0x000000, 0.7);
        bgRect.setScrollFactor(0, 0);
        bgRect.setDepth(9999);
        bgRect.setOrigin(0.5, 0.5);
        
        const victoryText = this.add.text(screenX, screenY - 50, 'LEVEL 2 COMPLETE!', {
            fontSize: '48px',
            fill: '#00FF00',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        victoryText.setOrigin(0.5, 0.5);
        victoryText.setScrollFactor(0, 0);
        victoryText.setDepth(10000);
        
        const victoryPointsText = this.add.text(screenX, screenY + 20, `Points: ${this.points}`, {
            fontSize: '32px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        victoryPointsText.setOrigin(0.5, 0.5);
        victoryPointsText.setScrollFactor(0, 0);
        victoryPointsText.setDepth(10000);
        
        const nextLevelText = this.add.text(screenX, screenY + 50, 'Press N for Level 3', {
            fontSize: '24px',
            fill: '#00FF00',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        });
        nextLevelText.setOrigin(0.5, 0.5);
        nextLevelText.setScrollFactor(0, 0);
        nextLevelText.setDepth(10000);
        
        const restartText = this.add.text(screenX, screenY + 90, 'Press R to restart', {
            fontSize: '24px',
            fill: '#FFFF00',
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
        this.nextLevelText = nextLevelText;
        this.restartText = restartText;
        this.victoryKeyPressed = false;
        
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
    }
    
    update() {
        // DEBUG: Verify update is running
        if (!this.updateLogged) {
            console.log('=== UPDATE FUNCTION IS RUNNING ===');
            this.updateLogged = true;
        }
        
        // If level is completed, check for victory screen keys
        if (this.levelCompleted && !this.victoryKeyPressed) {
            // Check for next level key (N)
            if (this.nKey && this.nKey.isDown) {
                console.log('N key pressed - transitioning to Level 3');
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
                    console.log('Starting Level3Scene...');
                    this.scene.start('Level3Scene');
                    console.log('Scene.start() called');
                });
                return;
            }
            // Check for restart key (R)
            if (this.rKey && this.rKey.isDown) {
                console.log('R key pressed - restarting level');
                this.victoryKeyPressed = true;
                this.levelCompleted = false;
                if (this.victoryBgRect) this.victoryBgRect.destroy();
                if (this.victoryText) this.victoryText.destroy();
                if (this.victoryPointsText) this.victoryPointsText.destroy();
                if (this.nextLevelText) this.nextLevelText.destroy();
                if (this.restartText) this.restartText.destroy();
                this.scene.restart();
                return;
            }
            return;
        }
        
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
        
        // Update snowflake animation
        this.updateSnowflakes();
        
        // Update enemies (white turtles throwing snowballs)
        this.updateEnemies();
        
        // Update snowmen (ground enemies)
        this.updateSnowmen();
        
        // Update rolling snowballs
        this.updateRollingSnowballs();
        
        // Pringle collection is now handled by physics overlap detector - no need to check here
        
        // Check for cloud levitation - very simple detection
        // DEBUG: Log once to verify this code runs
        if (!this.hasLoggedCloudCheck) {
            console.log('Cloud levitation check is running. secretCloud exists:', !!this.secretCloud, 'player exists:', !!this.player);
            this.hasLoggedCloudCheck = true;
        }
        
        if (!this.isLevitating) {
            // First check if we have the required objects
            if (!this.secretCloud) {
                console.log('No secretCloud!');
            } else if (!this.player) {
                console.log('No player!');
            } else if (!this.player.active) {
                console.log('Player not active!');
            } else {
                // We have everything, check if player is on cloud
                const cloudBounds = this.secretCloud.getBounds();
                const playerX = this.player.x;
                const playerY = this.player.y;
                const playerBottom = playerY + (this.player.body.height / 2);
                
                // Very forgiving check - just see if player is near cloud and touching down
                const isOverCloud = playerX >= cloudBounds.left - 20 && playerX <= cloudBounds.right + 20;
                const cloudTop = cloudBounds.top;
                const isNearCloudTop = playerBottom >= cloudTop - 30 && playerBottom <= cloudTop + 40;
                const isOnCloud = isOverCloud && isNearCloudTop && this.player.body.touching.down;
                
                // Debug - log when near cloud
                if (isOverCloud && !this.wasOnCloud) {
                    console.log('NEAR CLOUD - X:', playerX.toFixed(1), 'Cloud X range:', (cloudBounds.left - 20).toFixed(1), 'to', (cloudBounds.right + 20).toFixed(1));
                    console.log('NEAR CLOUD - Bottom:', playerBottom.toFixed(1), 'Cloud top:', cloudTop.toFixed(1), 'Range:', (cloudTop - 30).toFixed(1), 'to', (cloudTop + 40).toFixed(1));
                    console.log('NEAR CLOUD - Touching down:', this.player.body.touching.down, 'Is on cloud:', isOnCloud);
                }
                
                // Trigger levitation when player lands on cloud
                if (isOnCloud && !this.wasOnCloud) {
                    console.log('*** TRIGGERING LEVITATION NOW! ***');
                    this.startLevitation();
                }
                
                // Update tracking
                this.wasOnCloud = isOnCloud;
            }
        }
        
        if (this.player && this.player.y > 580) {
            this.scene.restart();
            return;
        }
        
        let isMoving = false;
        
        // Prevent horizontal movement during levitation
        if (!this.isLevitating) {
            if (this.cursors.left.isDown || this.wasd.A.isDown) {
                this.player.setVelocityX(-this.playerSpeed);
                isMoving = true;
                this.facingDirection = -1;
                this.player.setFlipX(true);
            } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
                this.player.setVelocityX(this.playerSpeed);
                isMoving = true;
                this.facingDirection = 1;
                this.player.setFlipX(false);
            } else {
                this.player.setVelocityX(0);
            }
        } else {
            // During levitation, keep player centered on beam
            this.player.setVelocityX(0);
            this.player.x = this.secretCloud.x; // Keep player aligned with cloud
        }
        
        const isOnGround = this.player.body.touching.down;
        const isMovingUp = this.player.body.velocity.y < 0;
        const isMovingDown = this.player.body.velocity.y > 0;
        
        // Only apply normal jump if not levitating
        if ((this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown) && isOnGround && !this.isLevitating) {
            this.player.setVelocityY(this.jumpSpeed);
        }
        
        if (!this.musicStarted && this.backgroundMusic && !this.backgroundMusic.isPlaying && (isMoving || (this.spaceKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown))) {
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

    hitSnowball(player, snowball) {
        // Check if player is invincible
        if (this.isInvincible) {
            if (snowball && snowball.active) {
                snowball.destroy();
            }
            return;
        }
        
        // Player hit by snowball - lose a heart
        const currentTime = this.time.now;
        if (currentTime - this.lastSpikeHitTime < this.spikeHitCooldown) {
            if (snowball && snowball.active) {
                snowball.destroy();
            }
            return; // Still in cooldown
        }
        
        this.lastSpikeHitTime = currentTime;
        
        // Play hit sound
        if (this.hitSound) {
            this.hitSound.play();
        }
        
        // Lose a heart
        this.takeDamage(1);
        this.updateHeartsDisplay();
        
        // Make player invincible temporarily
        this.isInvincible = true;
        this.time.delayedCall(this.invincibilityDuration, () => {
            this.isInvincible = false;
        });
        
        // Apply knockback (same as cloud knockback)
        // Calculate direction based on snowball's velocity or position relative to player
        const knockbackDistance = 250; // One platform distance (same as cloud)
        let knockbackX = player.x;
        
        // Determine knockback direction based on snowball's position relative to player
        if (snowball && snowball.active) {
            // Knockback in direction away from where snowball came from
            const snowballX = snowball.x;
            const playerX = player.x;
            if (snowballX < playerX) {
                // Snowball came from left, knockback right
                knockbackX = player.x + knockbackDistance;
            } else {
                // Snowball came from right, knockback left (backward)
                knockbackX = player.x - knockbackDistance;
            }
        } else {
            // Default to backward (left) if snowball already destroyed
            knockbackX = player.x - knockbackDistance;
        }
        
        // Apply knockback with velocity (same as cloud)
        const knockbackDir = (knockbackX > player.x) ? 1 : -1;
        player.body.setVelocityX(knockbackDir * 400); // Strong backward/forward velocity
        player.body.setVelocityY(-200); // Slight upward bounce
        
        // Also directly move player back to ensure they move
        this.tweens.add({
            targets: player,
            x: knockbackX,
            duration: 300,
            ease: 'Power2'
        });
        
        // Destroy the snowball
        if (snowball && snowball.active) {
            snowball.destroy();
        }
        
        // Check if player is dead
        if (this.hearts <= 0) {
            this.scene.restart();
        }
        
        console.log('Player hit by snowball! Hearts remaining:', this.hearts);
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