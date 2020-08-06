var cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
var suits = ["diamonds", "hearts", "spades", "clubs"];
var deck = new Array();
var playerBoard = [true, true, true, true]
var players = new Array();
var moneys = new Array();

function getDeck(){
    var deck = new Array();
    for(var i = 0; i < suits.length; i++){
        for(var x = 0; x < cards.length; x++){
            var card = {Value: cards[x], Suit: suits[i]};
            deck.push(card);
        }
    }
    return deck;
}

function shuffle()
{
    // for 1000 turns
    // switch the values of two random cards
    for (var i = 0; i < 1000; i++){
        var location1 = Math.floor((Math.random() * deck.length));
        var location2 = Math.floor((Math.random() * deck.length));
        var tmp = deck[location1];
        deck[location1] = deck[location2];
        deck[location2] = tmp;
    }
    renderDeck();
}

function giveHand()
{
    // for 1000 turns
    // switch the values of two random cards
    for (var i = 0; i < 1000; i++){
        var location1 = Math.floor((Math.random() * deck.length));
        var location2 = Math.floor((Math.random() * deck.length));
        var tmp = deck[location1];
        deck[location1] = deck[location2];
        deck[location2] = tmp;
    }
    renderHand();
}

function renderHand()
{
    const handSize = 2;
    document.getElementById('deck').innerHTML = '';
    for(var i = 0; i < handSize; i++)
    {
        var card = document.createElement("div");
        var value = document.createElement("div");
        var suit = document.createElement("div");
        card.className = "card";
        value.className = "value";
        suit.className = "suit " + deck[i].Suit;
        value.innerHTML = deck[i].Value;
        card.appendChild(value);
        card.appendChild(suit);
        document.getElementById("deck").appendChild(card);
    }
}

function renderDeck()
{
    document.getElementById('deck').innerHTML = '';
    for(var i = 0; i < deck.length; i++)
    {
        var card = document.createElement("div");
        var value = document.createElement("div");
        var suit = document.createElement("div");
        card.className = "card";
        value.className = "value";
        suit.className = "suit " + deck[i].Suit;

        value.innerHTML = deck[i].Value;
        card.appendChild(value);
        card.appendChild(suit);

        document.getElementById("deck").appendChild(card);
    }
}

function displayForm(){
    document.getElementById("startbtn").style.display = "none";
    document.getElementById("container").style.display = "none";
    document.getElementById("form_container").style.display = "block";
}

function displayBoard() {
    document.getElementById("cards_board").style.display = "block";
    document.getElementById("player_board1").style.display = "block";
    document.getElementById("player_board2").style.display = "block";
    document.getElementById("player_board3").style.display = "block";
    document.getElementById("player_board4").style.display = "block";
    document.getElementById("game_title").style.textAlign = "left";
    document.getElementById("logArea").style.display = "block";
}

function placePlayerOnBoard() {
    var playerPlaced = false;
    for(var i=1; i<=4; ++i){
        if(playerBoard[i-1]){
            document.getElementById("player_name"+i).style.display = "block";
            document.getElementById("player_money"+i).style.display = "block";
            document.getElementById("chips"+i).style.display = "block";
            document.getElementById("player_name"+i).innerHTML=players[i-1];
            document.getElementById("player_money"+i).innerHTML=moneys[i-1];
            playerPlaced = true;
            playerBoard[i-1]=false;
            break;
        }
    }
    if(!playerPlaced){
        alert("No space for another player!");
    }
}

function checkForOtherPlayers() {
    if(players.length<2){
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
        document.getElementById("logArea").textContent += "Waiting for other players..\n";
    }
}

function logPlayer() {
    document.getElementById("form_container").style.display = "none";
    var nickname = document.getElementById("nick").value;
    var money = document.getElementById("money").value;
    players.push(nickname);
    moneys.push(money);
    displayBoard();
    placePlayerOnBoard()
    checkForOtherPlayers();
    return false;
}

/*function load()
{
    deck = getDeck();
    document.getElementById ("startbtn").style.display = "block";
    //document.getElementById ("startbtn").addEventListener ("click", displayForm, false);
}

window.onload = load;*/