document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startButton = document.getElementById('start-button');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const restartButton = document.getElementById('restart-button');

    // Game settings
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 30;
    const NEXT_BLOCK_SIZE = 25;
    const COLORS = [
        null,
        '#ff6d00', // I - Orange
        '#2979ff', // J - Blue
        '#ffeb3b', // L - Yellow
        '#00c853', // O - Green
        '#d500f9', // S - Purple
        '#ff1744', // T - Red
        '#00e5ff', // Z - Cyan
    ];

    // Minecraft-style texture settings
    const blockBorder = 2;
    const blockInnerBorder = 1;
    const blockLightShadow = 'rgba(255, 255, 255, 0.3)';
    const blockDarkShadow = 'rgba(0, 0, 0, 0.4)';

    // Tetromino shapes
    const PIECES = [
        null,
        // I
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        // J
        [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0]
        ],
        // L
        [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0]
        ],
        // O
        [
            [4, 4],
            [4, 4]
        ],
        // S
        [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        // T
        [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        // Z
        [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ]
    ];

    // Game variables
    let board = [];
    let score = 0;
    let level = 1;
    let lines = 0;
    let dropCounter = 0;
    let dropInterval = 1000; // Initial drop speed (milliseconds)
    let lastTime = 0;
    let gameActive = false;
    let animationId = null;
    let player = {
        pos: { x: 0, y: 0 },
        piece: null,
        next: null
    };

    // Ensure the game over screen is hidden on initialization
    gameOverElement.classList.add('hidden');

    // Create game board
    function createBoard() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    // Draw a Minecraft-style block
    function drawBlock(ctx, x, y, color, size) {
        const blockSize = size || BLOCK_SIZE;
        
        // Main block color
        ctx.fillStyle = color;
        ctx.fillRect(x, y, blockSize, blockSize);
        
        // Light edge (top and left)
        ctx.fillStyle = blockLightShadow;
        ctx.fillRect(
            x, 
            y, 
            blockSize, 
            blockInnerBorder
        );
        ctx.fillRect(
            x, 
            y, 
            blockInnerBorder, 
            blockSize
        );
        
        // Dark edge (bottom and right)
        ctx.fillStyle = blockDarkShadow;
        ctx.fillRect(
            x, 
            y + blockSize - blockInnerBorder, 
            blockSize, 
            blockInnerBorder
        );
        ctx.fillRect(
            x + blockSize - blockInnerBorder, 
            y, 
            blockInnerBorder, 
            blockSize
        );
        
        // Grid texture
        ctx.strokeStyle = blockDarkShadow;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        
        // Horizontal grid lines
        for (let i = 1; i < 3; i++) {
            ctx.moveTo(x, y + (blockSize / 3) * i);
            ctx.lineTo(x + blockSize, y + (blockSize / 3) * i);
        }
        
        // Vertical grid lines
        for (let i = 1; i < 3; i++) {
            ctx.moveTo(x + (blockSize / 3) * i, y);
            ctx.lineTo(x + (blockSize / 3) * i, y + blockSize);
        }
        
        ctx.stroke();
        
        // Outer border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = blockBorder;
        ctx.strokeRect(x, y, blockSize, blockSize);
    }

    // Draw the game board
    function drawBoard() {
        ctx.fillStyle = '#3c3c3c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(
                        ctx,
                        x * BLOCK_SIZE,
                        y * BLOCK_SIZE,
                        COLORS[value]
                    );
                }
            });
        });
    }

    // Draw the current piece
    function drawPiece(piece, offset) {
        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(
                        ctx,
                        (x + offset.x) * BLOCK_SIZE,
                        (y + offset.y) * BLOCK_SIZE,
                        COLORS[value]
                    );
                }
            });
        });
    }

    // Draw the next piece
    function drawNextPiece() {
        nextPieceCtx.fillStyle = 'rgba(60, 60, 60, 0.8)';
        nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

        if (!player.next) return;

        const piece = player.next;
        const pieceWidth = piece[0].length;
        const pieceHeight = piece.length;
        const offsetX = (4 - pieceWidth) / 2;
        const offsetY = (4 - pieceHeight) / 2;

        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(
                        nextPieceCtx,
                        (x + offsetX) * NEXT_BLOCK_SIZE + 10,
                        (y + offsetY) * NEXT_BLOCK_SIZE + 10,
                        COLORS[value],
                        NEXT_BLOCK_SIZE
                    );
                }
            });
        });
    }

    // Collision detection
    function collide() {
        const [piece, pos] = [player.piece, player.pos];
        
        // Guard against missing piece during initialization
        if (!piece) return false;
        
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x] !== 0 && 
                   (board[y + pos.y] === undefined || 
                    board[y + pos.y][x + pos.x] === undefined ||
                    board[y + pos.y][x + pos.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Create a new tetromino
    function createPiece() {
        const pieces = 'IJLOSTZ';
        const pieceType = pieces[Math.floor(Math.random() * pieces.length)];
        const index = pieces.indexOf(pieceType) + 1;
        return PIECES[index];
    }

    // Reset player position and get new piece
    function resetPlayer() {
        player.piece = player.next || createPiece();
        player.next = createPiece();
        player.pos.y = 0;
        player.pos.x = Math.floor((COLS - player.piece[0].length) / 2);

        // Game over if the piece doesn't fit
        if (gameActive && collide()) {
            gameOver();
        }

        drawNextPiece();
    }

    // Game over
    function gameOver() {
        gameActive = false;
        // Cancel the animation frame to stop the game loop
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        finalScoreElement.textContent = score;
        gameOverElement.classList.remove('hidden');
    }

    // Rotate the piece
    function rotatePiece(matrix, direction) {
        // Transpose the matrix
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < y; x++) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }

        // Reverse each row to get a clockwise rotation
        if (direction > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            // Reverse each column to get a counter-clockwise rotation
            matrix.reverse();
        }
    }

    // Player movement
    function playerMove(direction) {
        player.pos.x += direction;
        if (collide()) {
            player.pos.x -= direction;
        }
    }

    // Player rotation
    function playerRotate(direction) {
        const pos = player.pos.x;
        let offset = 1;
        rotatePiece(player.piece, direction);

        // Handle wall kicks
        while (collide()) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.piece[0].length) {
                rotatePiece(player.piece, -direction);
                player.pos.x = pos;
                return;
            }
        }
    }

    // Player drop
    function playerDrop() {
        player.pos.y++;
        if (collide()) {
            player.pos.y--;
            mergePiece();
            resetPlayer();
            clearLines();
        }
        dropCounter = 0;
    }

    // Hard drop
    function hardDrop() {
        while (!collide()) {
            player.pos.y++;
        }
        player.pos.y--;
        mergePiece();
        resetPlayer();
        clearLines();
        dropCounter = 0;
    }

    // Merge piece with the board
    function mergePiece() {
        player.piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    // Clear completed lines
    function clearLines() {
        let linesCleared = 0;
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }

            // Remove the line
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            linesCleared++;
        }

        // Update score
        if (linesCleared > 0) {
            // Scoring: 40, 100, 300, or 1200 points for 1, 2, 3, or 4 lines
            const points = [0, 40, 100, 300, 1200][linesCleared] * level;
            score += points;
            lines += linesCleared;
            scoreElement.textContent = score;
            linesElement.textContent = lines;

            // Level up every 10 lines
            const newLevel = Math.floor(lines / 10) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelElement.textContent = level;
                dropInterval = Math.max(100, 1000 - (level - 1) * 100); // Speed up with each level
            }
        }
    }

    // Main game update loop
    function update(time = 0) {
        if (!gameActive) return;

        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
        animationId = requestAnimationFrame(update);
    }

    // Draw the game
    function draw() {
        drawBoard();
        if (player.piece) {
            drawPiece(player.piece, player.pos);
        }
    }

    // Key controls
    document.addEventListener('keydown', event => {
        if (!gameActive) return;

        switch (event.keyCode) {
            case 37: // Left Arrow
                playerMove(-1);
                break;
            case 39: // Right Arrow
                playerMove(1);
                break;
            case 40: // Down Arrow
                playerDrop();
                break;
            case 38: // Up Arrow
                playerRotate(1);
                break;
            case 32: // Space
                hardDrop();
                break;
        }
    });

    // Start or restart the game
    function startGame() {
        // Cancel any existing animation frame
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Make sure game over screen is hidden
        gameOverElement.classList.add('hidden');
        
        // Reset game state
        gameActive = true;
        createBoard();
        score = 0;
        level = 1;
        lines = 0;
        dropCounter = 0;
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
        lastTime = 0;
        dropInterval = 1000;
        
        // Initialize player and pieces
        player.next = createPiece();
        resetPlayer();
        
        // Start the game loop
        animationId = requestAnimationFrame(update);
    }

    // Start button
    startButton.addEventListener('click', () => {
        startGame();
        if (startButton.textContent !== 'RESTART') {
            startButton.textContent = 'RESTART';
        }
    });

    // Restart button
    restartButton.addEventListener('click', () => {
        startGame();
    });

    // Initialize the game board and display
    createBoard();
    player.next = createPiece();
    drawNextPiece();
    drawBoard();

    // Don't start the game automatically, wait for the Start button click
    gameActive = false;
});