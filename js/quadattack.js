/*
* This game is protected by copyright. Distribution forbidden.
* Game idea: Markus Brunner (mail@markusbrunner-design.de)
* Implementation: Katja Deutschmann (mail@katjadeutschmann.de)
*/

var QuadAttack = new Class({
	
	TILE_TYPE_PLUS: 'plus',
	TILE_TYPE_QUAD: 'quad',
	TILE_TYPE_LINE: 'line',
	TILE_TYPE_CROSS: 'cross',
	TILE_TYPE_EIGHTER: 'eighter',
	TILE_ORIENTATION_HORIZONTAL: 'line_h',
	TILE_ORIENTATION_VERTICAL: 'line_v',
	FIELD_TYPE_DROPPABLE: 'droppable',
	FIELD_TYPE_NOT_DROPPABLE: 'notdroppable',
	PLAYER1: 'player1',
	PLAYER2: 'player2',	
	
	currentPlayer: null,
	currentPlayerName: null,
	currentTileType: null,
	player1LastTileType: null,
	player2LastTileType: null,
	currentTileOrientation: null,
	currentTilePosition: null,
	// all Elements that are currently droppable
	currentDroppables: null,
	// last tile Element
	lastTile: null,
	// all already played tile Elements
	player1PlayedTiles: null,
	player2PlayedTiles: null,
	player1PlayedTilesCounter: 0,
	player2PlayedTilesCounter: 0,
	
	won: false,
	
	Implements: [Options, Log],
	
	options: {
		// all field Elements - droppable or not
		fields: [],
		// all tile types (String constants)
		tileTypes: [],
		// all Drag.Move tiles left to play
		player1Tiles: {},
		player2Tiles: {},
		// names of players
		player1name: 'player1',
		player2name: 'player2'
	},
	
	/* 
	* Initializes this class.
	* @param options: The options for this class.
	*/
	initialize: function(options) {
		this.enableLog();
		this.setOptions(options);
		
		$('gameboard').empty();
		$('player1').empty();
		$('player2').empty();
		
		this.options.tileTypes = [this.TILE_TYPE_PLUS, this.TILE_TYPE_QUAD, this.TILE_TYPE_LINE, this.TILE_TYPE_CROSS, this.TILE_TYPE_EIGHTER];
		
		this.options.player1Tiles = new Hash();
		this.options.player2Tiles = new Hash();	
		this.options.tileTypes.each(function(tileType) {
			this.options.player1Tiles.set(tileType, new Array());
			this.options.player2Tiles.set(tileType, new Array());
		}.bind(this));
		
		this.player1PlayedTiles = new Array(8);
		for (var i = 0; i < 8; i++) {
			this.player1PlayedTiles[i] = new Array(8);
		}
		this.player2PlayedTiles = new Array(8);
		for (var i = 0; i < 8; i++) {
			this.player2PlayedTiles[i] = new Array(8);
		}
		
		this.createFields();
		this.createTiles();
		
		this.currentPlayer = this.PLAYER1;	
		this.currentPlayerName = this.options.player1name;
		
		this.setInfoText('White begins.');
	},
	
	/* 
	* Creates the fields a adds them to the gameboard.
	*/	
	createFields: function() {
		// create a new 8x8 array for the field
		this.options.fields = new Array(8);		
		for (var x = 0; x < 8; x++) {
			this.options.fields[x] = new Array(8);
			for (var y = 0; y < 8; y++) {
				// create a div-Element for the field inside the gameboard
				var field = new Element('div', {'class': this.FIELD_TYPE_DROPPABLE/*, 'text': x + '-' + y*/});
				$('gameboard').grab(field);
				// put the field to the fields array
				this.options.fields[x][y] = field;				
			}
		}
	},
	
	/*
	* Creates the tiles.
	*/
	createTiles: function() {	
		var players = [this.PLAYER1, this.PLAYER2];

		players.each(function(player) {
			this.options.tileTypes.each(function(tileType) {
				// create one eighter
				if (tileType == this.TILE_TYPE_EIGHTER) {
					this.createTile(tileType, null, player, 1);
				}
				// create eight lines with an orientation
				else if (tileType == this.TILE_TYPE_LINE) {
					for (var i = 0; i < 8; i++) {
						this.createTile(tileType, this.TILE_ORIENTATION_HORIZONTAL, player, i+1);						
					}					
				}
				// create eight pluses, crosses and quads
				else {
					for (var i = 0; i < 8; i++) {
						this.createTile(tileType, null, player, i+1);
					}					
				}
			}.bind(this));
		}.bind(this));	
	},
	
	/*
	* Creates a single tile, makes it playable and adds it to the corresponding players tiles.
	* @param tileType: The type of the tile. Can be one of TILE_TYPE_PLUS, TILE_TYPE_QUAD, TILE_TYPE_LINE, TILE_TYPE_CROSS, TILE_TYPE_EIGHTER.
	* @param tileOrientation: The orientation of the tile. Can be one of TILE_ORIENTATION_HORIZONTAL, TILE_ORIENTATION_VERTICAL. 
	* If null no orientation is set.
	* @param player: The player who the tile belongs to. Can be one of PLAYER1, PLAYER2.
	* @param index: The index of the tile. This will display the amount of tiles of a type left.
	*/
	createTile: function(tileType, tileOrientation, player, index) {
		// create div with tile type and a span with the tile index
		var indexSpan = new Element('span', {
			'text': index			
		});
		var tile = new Element('div', {
			'title': tileType
		});
		tile.grab(indexSpan);
		
		// add class and orientation switch handler (only for line)
		if (tileOrientation != null) {
			tile.addClass(tileOrientation + ' ' + player);
			// add orientation switch handler		
			tile.addEvent('dblclick', function() {
				this.switchTileOrientation(tile)
			}.bind(this));
		}
		else {
			tile.addClass(tileType + ' ' + player);
		}

		$(player).grab(tile);
		
		// make the tile draggable and add game play behavior
		var draggableTile = this.addGamePlayFunctionality(tile);
		if (player == this.PLAYER1) {
			this.options.player1Tiles.get(tileType).push(draggableTile);
		}
		else {
			// set the tiles of player2 not draggable; will be set draggable with switchPlayer()
			draggableTile.disable();
			this.options.player2Tiles.get(tileType).push(draggableTile);			
		}
	},
	
	/*
	* Adds the game play functionality to a tile. This is the core function of this game.
	* @param tile: The tile to set game play functionality to.
	* @return: The tile with game play functionality.
	*/
	addGamePlayFunctionality: function(tile) {
		var self = this;
		var thisTile = tile;
		var dragStartPosX = thisTile.getStyle('left');
		var dragStartPosY = thisTile.getStyle('top');

		var draggableTile = new Drag.Move(thisTile, {
			droppables: self.getCurrentDroppables(),

			onSnap: function(tile) {
				tile.addClass('drag');				

				// set type of current
				self.currentTileType = self.getTileType(tile);

				// block the eight fields around already played tiles of same type and player					
				if (self.currentPlayer == self.PLAYER1) {
					for (var x = 0; x < 8; x++) {
						for (var y = 0; y < 8; y++) {								
							if (self.player1PlayedTiles[x][y] != null && self.getTileType(self.player1PlayedTiles[x][y]) == self.currentTileType) {
								self.setNotDroppableQuad(x, y);
							}
						}
					}
				}
				else {
					for (var x = 0; x < 8; x++) {
						for (var y = 0; y < 8; y++) {								
							if (self.player2PlayedTiles[x][y] != null && self.getTileType(self.player2PlayedTiles[x][y]) == self.currentTileType) {
								self.setNotDroppableQuad(x, y);
							}
						}
					}
				}
								
				// update the droppables of this Drag.Move-object
				this.droppables = self.getCurrentDroppables();					
			},

			onDrop: function(tile, field) {
				if (field) {
					// remove z-index definition of tile 
					tile.removeClass('drag');

					// move tile to end position
					tile.set('move', {
						relativeTo: field,
						duration: 'short',
						transition: 'quad:out'
					});
					tile.move();
					
					// remove highlight from last tile
					if (self.lastTile != null) {
						self.lastTile.toggleClass('last');			
					}

					// define position of current tile		
					self.currentTilePosition = self.getFieldPosition(field);
					
					// define orientation of current tile
					self.currentTileOrientation = self.getTileOrientation(tile);

					// remove drag and orientation switch functionality
					this.detach();
					thisTile.removeEvents('dblclick');
					thisTile.set('text', '');
					
					if (self.currentPlayer == self.PLAYER1) {
						// add current tile to player1PlayedTiles and erase from options.player1tiles
						self.player1PlayedTiles[self.currentTilePosition.x][self.currentTilePosition.y] = tile;
						self.options.player1Tiles.get(self.currentTileType).pop();
						// increase playedTilesCounter of player
						self.player1PlayedTilesCounter++;
						// set last tile type of player for next round
						self.player1LastTileType = self.currentTileType;
						// search for winning line
						self.won = self.hasWon(self.player1PlayedTiles, self.player1PlayedTilesCounter);
					}
					else {
						// add current tile to player2PlayedTiles and erase from options.player2tiles
						self.player2PlayedTiles[self.currentTilePosition.x][self.currentTilePosition.y] = tile;
						self.options.player2Tiles.get(self.currentTileType).pop();
						// increase playedTilesCounter of player
						self.player2PlayedTilesCounter++;
						// set last tile type of player for next round
						self.player2LastTileType = self.currentTileType;
						// search for winning line	
						self.won = self.hasWon(self.player2PlayedTiles, self.player2PlayedTilesCounter);
					}

					// if the player won
					if (self.won) {
						self.showWinner();
						self.won = true;
						self.options.player1Tiles.empty();
						self.options.player2Tiles.empty();
					}
 					else {
						// set fields droppable or not droppable
						self.setFieldStates();

						// set last tile and last tile type
						self.lastTile = tile;

						// highlight last tile
						tile.toggleClass('last');

						// next player
						self.switchPlayer();	
					}
				}
				else {
					// fire cancel event of this object
					this.fireEvent('cancel', tile);
				}
			},

			onCancel: function(tile) {
				// set tile to its start position next to the gameboard if not dropped on a permitted field
				tile.set('move', {
					relativeTo: tile.getOffsetParent(),
					duration: 'short',
					edge: 'upperLeft',
					position: 'upperLeft',
					transition: 'quad:out',
					offset: {
						x: dragStartPosX.toInt(),
						y: dragStartPosY.toInt()
					}
				});
				tile.move();
				
				// reconstruct the field state if the move was cancelled		
				if (self.player1LastTileType != null && self.player2LastTileType != null) {					
					if (self.currentPlayer == self.PLAYER1) {
						self.currentTileType = self.player2LastTileType;
					}
					else {
						self.currentTileType = self.player1LastTileType;						
					}					
					self.setFieldStates();
				}
			},
			
			onEnter: function(tile, field) {
				field.toggleClass('over');
			},
			
			onLeave: function(tile, field) {
				field.toggleClass('over');
			}
		});
		return draggableTile;
	},
	
	/*
	* Gets the current droppable fields by the class names of the fields.
	* @return The current droppable fields.
	*/
	getCurrentDroppables: function() {
		return $$('.' + this.FIELD_TYPE_DROPPABLE);
	},
	
	/*
	* Gets the type of a tile.
	* @param tile: The tile to get the type of.
	* @return: The type of the tile.
	*/
	getTileType: function(tile) {
		return tile.get('title');
	},
	
	/*
	* Gets the type of a tile.
	* @param tile: The tile to get the orientation of.
	* @return: The orientation of the tile or null if there is no orientation.
	*/	
	getTileOrientation: function(tile) {
		var cssClass = tile.get('class');
		if (cssClass.contains(this.TILE_ORIENTATION_HORIZONTAL)) {
			return this.TILE_ORIENTATION_HORIZONTAL;
		}
		else if (cssClass.contains(this.TILE_ORIENTATION_VERTICAL)) {
			return this.TILE_ORIENTATION_VERTICAL;
		}
		else {
			return null;
		}
	},
	
	/*
	* Switches the orientation of a tile by setting its css class.
	* @param tile: The tile to switch the orientation of.
	*/
	switchTileOrientation: function(tile) {
		var cssClass = tile.get('class');
		if (cssClass.contains(this.TILE_ORIENTATION_HORIZONTAL)) {
			cssClass = cssClass.replace(this.TILE_ORIENTATION_HORIZONTAL, this.TILE_ORIENTATION_VERTICAL);
		}
		else if (cssClass.contains(this.TILE_ORIENTATION_VERTICAL)) {
			cssClass = cssClass.replace(this.TILE_ORIENTATION_VERTICAL, this.TILE_ORIENTATION_HORIZONTAL);
		}
		else {

		}
		tile.set('class', cssClass);
	},
	
	/*
	* Gets the position of a field. This is used to get the position of a dropped on tile.
	* @param field: The field to get the position of.
	* @return: The position of the field.
	*/
	getFieldPosition: function(field) {	
		var position = {
			x: 0,
			y: 0
		};
		
		// get position of field
		for (var fieldX = 0; fieldX < 8; fieldX++) {
			for (var fieldY = 0; fieldY < 8; fieldY++) {
				// set the current x and y index as position if the specified field matches a field in the fields array
				if (field == this.options.fields[fieldX][fieldY]) {
					position.x = fieldX;
					position.y = fieldY;
				}
			}
		}
		
		return position;
	},
	
	/*
	* Switches the current player.
	*/
	switchPlayer: function() {
		// current player is first player
		if (this.currentPlayer == this.PLAYER1) {
			// switch to second player
			this.currentPlayer = this.PLAYER2;
			this.currentPlayerName = this.options.player2name;
			// disable tiles of first player
			this.options.player1Tiles.each(function(tilesOfType) {
				tilesOfType.each(function(tile) {
					tile.disable();			
				});
			});
			// enable tiles of second player
			this.options.player2Tiles.each(function(tilesOfType, tileType) {
				if (this.player2LastTileType == null || tileType != this.player2LastTileType) {
					tilesOfType.each(function(tile) {
						tile.enable();
					});					
				}
			}.bind(this));

		}
		// current player is second player
		else {
			// switch to first player
			this.currentPlayer = this.PLAYER1;
			this.currentPlayerName = this.options.player1name;
			// disable tiles of second player
			this.options.player2Tiles.each(function(tilesOfType) {
				tilesOfType.each(function(tile) {
					tile.disable();
				});
			});
			// enable tiles of first player
			this.options.player1Tiles.each(function(tilesOfType, tileType) {
				if (this.player1LastTileType == null || tileType != this.player1LastTileType) {
					tilesOfType.each(function(tile, tileType) {
						tile.enable();
					});					
				}
			}.bind(this));		
		}
		this.setInfoText('Please set your tile, ' + this.currentPlayerName + '.');
	},
	
	/*
	* Checks if the current player has won the game.
	* @param tiles The played tiles of the player.
	* @param tilesCounter The amount of played tiles of the player.
	* @return: True if the player won, otherwise false.
	*/
	hasWon: function(tiles, tilesCounter) {
		var foundTiles = 0;
		// analyze only if there are more than 4 tiles played
		if (tilesCounter >= 4) {
			// analyze while there are still combination of 4 tiles
			while (foundTiles < (tilesCounter - 3)) {
				for (var x = 0; x < 8; x++) {
					for (var y = 0; y < 8; y++) {
						// analyze only if here is a played tile
						if (tiles[x][y] != null) {
							// analyze the next 4 (including this) from left to right (horizontal)
							if (x < 5) {
								var neighborCombination = [tiles[x][y], tiles[x+1][y], tiles[x+2][y], tiles[x+3][y]];
								if (this.analyzeCombination(neighborCombination)) {
									return true;
								}
							}
							// analyze the next 4 (including this) from top to bottom (vertical)
							if (y < 5) {
								var neighborCombination = [tiles[x][y], tiles[x][y+1], tiles[x][y+2], tiles[x][y+3]];
								if (this.analyzeCombination(neighborCombination)) {
									return true;
								}
							}	
							// analyze the next 4 (including this) from top left to bottom right (diagonal)				
							if (x < 5 && y < 5) {
								var neighborCombination = [tiles[x][y], tiles[x+1][y+1], tiles[x+2][y+2], tiles[x+3][y+3]];
								if (this.analyzeCombination(neighborCombination)) {
									return true;
								}						
							}
							// analyze the next 4 (including this) from top right to bottom left (diagonal)
							if (x > 2 && y < 5) {
								var neighborCombination = [tiles[x][y], tiles[x-1][y+1], tiles[x-2][y+2], tiles[x-3][y+3]];
								if (this.analyzeCombination(neighborCombination)) {
									return true;
								}							
							}					
							foundTiles++;
						}
					}
				}
			}
		}
		return false;
	},
	
	/*
	* Analyzes a combination of four tiles if it contains the four basic tile types.
	* @param quadCombination An array with four tiles or null values.
	* @return: True if the combination contains the four basic tile types, otherwise false.
	*/
	analyzeCombination: function(quadCombination) {
		var containsCross = false;
		var containsLine = false;
		var containsQuad = false;
		var containsPlus = false;
		
		var tile = null;
		for (var i = 0; i < quadCombination.length; i++) {
			tile = quadCombination[i];
			if (typeof(tile) !== 'undefined' && tile != null) {
				switch (this.getTileType(tile)) {
					case this.TILE_TYPE_CROSS: 
						// contains cross
						containsCross = true;
						break;
					case this.TILE_TYPE_LINE:
						// contains line
						containsLine = true;
						break;
					case this.TILE_TYPE_QUAD:
						// contains quad
						containsQuad = true;
						break;
					case this.TILE_TYPE_PLUS:
						// contains plus
						containsPlus = true;
						break;
					default:
						break;
				}
			}
			else {
				return false;
			}
		}
		if (containsCross && containsLine && containsQuad && containsPlus) {
			return true;
		}
		return false;			
	},
	
	/* 
	* Sets the fields of the gameboard according to the game rules droppable or not 
	* (except the blockage of the eight fields around already played tiles of same type 
	* and player because we do not know the coming up tile type yet). So blocks all occupied fields
	* and sets the tile-specific blockage of the current played tile.
	*/
	setFieldStates: function() {
		// set all fields to droppable
		this.setDroppables(this.options.fields);
		
		// set all occupied fields to not droppable
		for (var x = 0; x < 8; x++) {
			for (var y = 0; y < 8; y++) {
				// if there is a played tile in the played tiles array at this x and y index
				// set the corresponding field in the fields array not droppable
				if (this.player1PlayedTiles[x][y] != null) {
					this.setNotDroppable(this.options.fields[x][y]);						
				}
				else if (this.player2PlayedTiles[x][y] != null) {
					this.setNotDroppable(this.options.fields[x][y]);						
				}
			}
		}

		var x = this.currentTilePosition.x;
		var y = this.currentTilePosition.y;

		// set tile-specific blocked fields of the current tile not droppable
		switch (this.currentTileType) {
			case this.TILE_TYPE_PLUS:
				this.setNotDroppablePlus(x, y);
				break;
			case this.TILE_TYPE_QUAD:
				this.setNotDroppableQuad(x, y);
				break;				
			case this.TILE_TYPE_LINE:
				// consider the orientation of a line
				if (this.currentTileOrientation == this.TILE_ORIENTATION_HORIZONTAL) {
					this.setNotDroppableHorizontalLine(x);					
				}
				else {
					this.setNotDroppableVerticalLine(y);					
				}
				break;	
			case this.TILE_TYPE_CROSS:
				this.setNotDroppableCross(x, y);
				break;
			case this.TILE_TYPE_EIGHTER:
				this.setNotDroppableEighter(x, y);
				break;				
			default:
				break;
		}
	},
	
	/*
	* Calls function setNotDroppable() for a horizontal line.
	* @param x: The x value of the field.
	*/
	setNotDroppableHorizontalLine: function(x) {
		for (var i = 0; i<8; i++) {
			this.setNotDroppable(this.options.fields[x][i]);
		}
	},
	
	/*
	* Calls function setNotDroppable() for a vertical line.
	* @param y: The y value of the field.
	*/
	setNotDroppableVerticalLine: function(y) {
		for (var i = 0; i<8; i++) {
			this.setNotDroppable(this.options.fields[i][y]);
		}
	},
	
	/*
	* Calls function setNotDroppable() for a plus.
	* @param x: The x value of the field.
	* @param y: The y value of the field.
	*/
	setNotDroppablePlus: function(x, y) {
		this.setNotDroppableHorizontalLine(x);
		this.setNotDroppableVerticalLine(y);
	},
	
	/*
	* Calls function setNotDroppable() for a quad.
	* @param x: The x value of the field.
	* @param y: The y value of the field.
	*/
	setNotDroppableQuad: function(x, y) {
		if (y < 7) {
			this.setNotDroppable(this.options.fields[x][y+1]);
		}
		if (y > 0) {
			this.setNotDroppable(this.options.fields[x][y-1]);
		}
		if (x > 0) {
			this.setNotDroppable(this.options.fields[x-1][y]);
		}	
		if (x < 7) {
			this.setNotDroppable(this.options.fields[x+1][y]);
		}
		if (x < 7 && y < 7) {
			this.setNotDroppable(this.options.fields[x+1][y+1]);
		}
		if (x > 0 && y < 7) {
			this.setNotDroppable(this.options.fields[x-1][y+1]);
		}
		if (x < 7 && y > 0) {
			this.setNotDroppable(this.options.fields[x+1][y-1]);
		}
		if (x > 0 && y > 0) {
			this.setNotDroppable(this.options.fields[x-1][y-1]);
		}
	},
	
	/*
	* Calls function setNotDroppable() for a cross.
	* @param x: The x value of the field.
	* @param y: The y value of the field.
	*/
	setNotDroppableCross: function(x, y) {
		for (var i = 1; i<=x && i<=y; i++) {
			this.setNotDroppable(this.options.fields[x-i][y-i]);
		}	
		for (var i = 1; i<(8-x) && i<(8-y); i++) {
			this.setNotDroppable(this.options.fields[x+i][y+i]);
		}
		for (var i = 1; i<=x && i<(8-y); i++) {
			this.setNotDroppable(this.options.fields[x-i][y+i]);
		}
		for (var i = 1; i<(8-x) && i<=y; i++) {
			this.setNotDroppable(this.options.fields[x+i][y-i]);
		}
	},
	
	/*
	* Calls function setNotDroppable() for an eighter.
	* @param x: The x value of the field.
	* @param y: The y value of the field.
	*/
	setNotDroppableEighter: function(x, y) {
		this.setNotDroppablePlus(x, y);
		this.setNotDroppableCross(x, y);
	},
	
	/* 
	* Sets a fields css class to droppable. 
	* This does not set the droppables of a tile. This is done by call of function getCurrentDroppables()
	* in addGamePlayFunctionality().
	* @param field: The field whose css class shall be set droppable.
	*/
	setDroppable: function(field) {
		if (field != null) {
			field.set('class', this.FIELD_TYPE_DROPPABLE);			
		}
	},
	
	/* 
	* Sets the fields css classes to droppable. 
	* This does not set the droppables of a tile. This is done by call of function getCurrentDroppables()
	* in addGamePlayFunctionality().
	* @param fields: An array with fields whose css classes shall be set droppable.
	*/
	setDroppables: function(fields) {
		fields.each(function(innerfields) {
			innerfields.each(function(field) {
				this.setDroppable(field);				
			}.bind(this));
		}.bind(this));
	},
	
	/* 
	* Sets a fields css class to not droppable. 
	* This does not set the droppables of a tile. This is done by call of function getCurrentDroppables()
	* in addGamePlayFunctionality().
	* @param field: The field whose css class shall be set not droppable.
	*/
	setNotDroppable: function(field) {
		if (field != null) {
			field.set('class', this.FIELD_TYPE_NOT_DROPPABLE);			
		}
	},
	
	/* 
	* Sets the fields css classes to not droppable. 
	* This does not set the droppables of a tile. This is done by call of function getCurrentDroppables()
	* in addGamePlayFunctionality().
	* @param fields: An array with fields whose css classes shall be set not droppable.
	*/
	setNotDroppables: function(fields) {
		fields.each(function(innerfields) {
			innerfields.each(function(field) {
				this.setNotDroppable(field);				
			}.bind(this));
		}.bind(this));
	},
	
	/*
	* Shows the winner and displays a restart button.
	*/
	showWinner: function() {
		$('form_legend').set('text', 'Congratulations!');
		$('form_winner').set('text', this.currentPlayerName + ' won the game!');
		$('form_winner').setStyle('display', 'block');
		$('form_button_start').setStyle('display', 'none');
		$('form_button_restart').setStyle('display', 'block');			
		$('form').fade();
	},
	
	/*
	* Sets the player names out of the start formular and fades the formular out.
	*/
	startGame: function() {
		this.setOptions({
			player1name: $('player1name').getProperty('value'),
			player2name: $('player2name').getProperty('value')
		});
		$('form').set('fade', {duration: 'long'});
		$('form').fade();
	},

	/*
	* Initializes this class once again and calls function startGame().
	*/
	restartGame: function() {
		this.initialize();
		this.startGame();
	},
	
	/*
	* Sets a text to the info box.
	* @param text: The text to set.
	*/
	setInfoText: function(text) {
		$('info').set('text', text);
	},
	
	/*
	* Used for debugging only. Return the values of two-dimensional collection as a String.
	* @param collection: The collection to represents as a String.
	* @return: The collection as a String.
	*/
	collectionToString: function(collection) {
		var text = '';
		collection.each(function(innerCollection, index) {
			innerCollection.each(function(item, itemIndex) {
				text = text.concat(index + '-' + itemIndex + ': ' + item.get('class') + ', ');
			});
			text = text.concat('\n');
		});
		return text;
	}	
});


Drag.Move.implement({
	
	/* 
	* Detaches the handles and adds them a css class to display the detached state. 
	*/
	disable: function() {
		this.detach();
		this.handles.addClass('disabled');
	},
	
	/* 
	* Attaches the handles and removes their css class to display a detached state. 
	*/
	enable: function() {
		this.attach();
		this.handles.removeClass('disabled');
	},
	
	/*
	* Adds a css class to the handles.
	* @param cssClass: The css class to set.
	*/
	addClass: function(cssClass) {
		this.handles.addClass(cssClass);
	},
	
	/*
	* Removes a css class from the handles.
	* @param cssClass: The css class to remove.
	*/
	removeClass: function(cssClass) {
		this.handles.removeClass(cssClass);
	},
});

window.addEvent('domready', function() {
	var quadAttack = new QuadAttack();
	$('form_button_start').addEvent('click', function() {
		this.startGame();
	}.bind(quadAttack));
	$('form_button_restart').addEvent('click', function() {
		this.restartGame();
	}.bind(quadAttack));
	
});