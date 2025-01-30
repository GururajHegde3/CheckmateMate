const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = '';
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement('div');
            squareElement.classList.add(
                'square',
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color === 'w' ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData('text/plain', "");
                    }
                });

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q', // Always promote to a queen for simplicity
    };

    // Check if the move is valid
    const legalMove = chess.move(move);
    if (legalMove) {
        socket.emit("move", move);

        if (chess.isGameOver()) {
            handleGameOver();
        }
    } else {
        alert("Invalid move! Please try again.");
    }

    chess.undo(); // Undo temporary move used for validation
    renderBoard();
};

const handleGameOver = () => {
    let resultMessage = "";

    if (chess.in_checkmate()) {
        resultMessage = chess.turn() === 'w' ? "Black wins by checkmate!" : "White wins by checkmate!";
    } else if (chess.in_stalemate()) {
        resultMessage = "The game is a stalemate!";
    } else if (chess.insufficient_material()) {
        resultMessage = "The game is a draw due to insufficient material!";
    } else if (chess.in_threefold_repetition()) {
        resultMessage = "The game is a draw by threefold repetition!";
    } else if (chess.in_draw()) {
        resultMessage = "The game is a draw!";
    }

    alert(resultMessage);
    boardElement.innerHTML = `<div class="game-over-message">${resultMessage}</div>`;
    boardElement.classList.add("disabled");
    socket.emit("gameOver", resultMessage);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙",
        K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟",
    };
    return unicodePieces[piece.type] || "";
};

// Event listeners for server events
socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    renderBoard();

    if (chess.isGameOver()) {
        handleGameOver();
    }
});

socket.on("gameOver", (resultMessage) => {
    alert(resultMessage);
    boardElement.innerHTML = `<div class="game-over-message">${resultMessage}</div>`;
    boardElement.classList.add("disabled");
});

// Listen for the reset event
socket.on("gameReset", () => {
    chess.reset();
    renderBoard();

    // Remove any game-over UI
    boardElement.classList.remove("disabled");
    boardElement.innerHTML = '';
    alert("The game has been reset. A new match is starting!");
});

renderBoard();
