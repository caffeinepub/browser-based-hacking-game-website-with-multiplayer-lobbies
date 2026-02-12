import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  public type TerminalOutput = {
    lines : [Text];
    solved : Bool;
    context : ?Text;
  };

  public type TerminalContext = {
    #welcome;
    #navigation;
    #exploration;
    #combat;
    #puzzle;
    #shop;
    #bossFight;
    #healingStation;
    #upgradeStation;
    #developerTest;
    #unknown;
  };

  type GameMode = {
    #solo;
    #cooperative;
    #competitive;
  };

  public type UserProfile = {
    name : Text;
    gamesPlayed : Nat;
    totalScore : Nat;
  };

  public type MatchResultView = {
    matchId : Nat;
    winner : ?Principal;
    scores : [(Principal, Nat)];
    mode : GameMode;
    timestamp : Time.Time;
  };

  public type LeaderboardEntry = {
    player : Principal;
    totalScore : Nat;
    wins : Nat;
  };

  module LeaderboardEntry {
    public func compareByScore(a : LeaderboardEntry, b : LeaderboardEntry) : Order.Order {
      Nat.compare(b.totalScore, a.totalScore);
    };
  };

  public type Challenge = {
    id : Nat;
    name : Text;
    description : Text;
  };

  public type Lobby = {
    id : Nat;
    host : Principal;
    players : Set.Set<Principal>;
    mode : GameMode;
    currentChallenge : ?Challenge;
    isActive : Bool;
  };

  public type LobbyView = {
    id : Nat;
    host : Principal;
    players : [Principal];
    mode : GameMode;
    currentChallenge : ?Challenge;
    isActive : Bool;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextLobbyId = 1;
  var nextMatchId = 1;

  let userProfiles = Map.empty<Principal, UserProfile>();
  var challenges = List.fromArray<Challenge>([]);
  let lobbies = Map.empty<Nat, Lobby>();
  let matchResults = List.empty<MatchResultView>();
  let leaderboard = Map.empty<Principal, LeaderboardEntry>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func createLobby(mode : GameMode) : async Nat {
    switch (mode) {
      case (#solo) {
        createSoloLobby(caller);
      };
      case (#cooperative or #competitive) {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
          Runtime.trap("Unauthorized: Only users can create cooperative or competitive lobbies");
        };
        createMultiplayerLobby(caller, mode);
      };
    };
  };

  func createSoloLobby(caller : Principal) : Nat {
    let soloLobby : Lobby = {
      id = nextLobbyId;
      host = caller;
      players = Set.singleton(caller);
      mode = #solo;
      currentChallenge = null;
      isActive = false;
    };
    let currentId = nextLobbyId;
    lobbies.add(nextLobbyId, soloLobby);
    nextLobbyId += 1;
    currentId;
  };

  func createMultiplayerLobby(host : Principal, mode : GameMode) : Nat {
    let multiplayerLobby : Lobby = {
      id = nextLobbyId;
      host;
      players = Set.singleton(host);
      mode;
      currentChallenge = null;
      isActive = false;
    };
    let currentId = nextLobbyId;
    lobbies.add(nextLobbyId, multiplayerLobby);
    nextLobbyId += 1;
    currentId;
  };

  public shared ({ caller }) func joinLobby(lobbyId : Nat) : async () {
    switch (lobbies.get(lobbyId)) {
      case (null) { Runtime.trap("Lobby not found") };
      case (?lobby) {
        switch (lobby.mode) {
          case (#cooperative or #competitive) {
            if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
              Runtime.trap("Unauthorized: Only users can join multiplayer lobbies");
            };
          };
          case (#solo) {};
        };
        if (not lobby.players.contains(caller)) {
          let updatedPlayers = lobby.players.clone();
          updatedPlayers.add(caller);
          let updatedLobby : Lobby = {
            id = lobby.id;
            host = lobby.host;
            players = updatedPlayers;
            mode = lobby.mode;
            currentChallenge = lobby.currentChallenge;
            isActive = lobby.isActive;
          };
          lobbies.add(lobbyId, updatedLobby);
        };
      };
    };
  };

  public shared ({ caller }) func leaveLobby(lobbyId : Nat) : async () {
    switch (lobbies.get(lobbyId)) {
      case (null) { Runtime.trap("Lobby not found") };
      case (?lobby) {
        if (not lobby.players.contains(caller)) {
          Runtime.trap("Unauthorized: You are not a member of this lobby");
        };
        let updatedPlayers = lobby.players.clone();
        updatedPlayers.remove(caller);
        let updatedLobby : Lobby = {
          id = lobby.id;
          host = lobby.host;
          players = updatedPlayers;
          mode = lobby.mode;
          currentChallenge = lobby.currentChallenge;
          isActive = lobby.isActive;
        };
        if (updatedPlayers.isEmpty()) {
          lobbies.remove(lobbyId);
        } else {
          lobbies.add(lobbyId, updatedLobby);
        };
      };
    };
  };

  public shared ({ caller }) func startMatch(lobbyId : Nat) : async () {
    switch (lobbies.get(lobbyId)) {
      case (null) { Runtime.trap("Lobby not found") };
      case (?lobby) {
        if (caller != lobby.host) {
          Runtime.trap("Unauthorized: Only the host can start the match");
        };
        if (lobby.isActive) {
          Runtime.trap("Match is already active");
        };
        let updatedLobby = {
          id = lobby.id;
          host = lobby.host;
          players = lobby.players;
          mode = lobby.mode;
          currentChallenge = ?{
            id = 1;
            name = "Sample Challenge";
            description = "Complete the sample challenge";
          };
          isActive = true;
        };
        lobbies.add(lobbyId, updatedLobby);
      };
    };
  };

  func updateLeaderboard(player : Principal, score : Nat) {
    switch (leaderboard.get(player)) {
      case (null) {
        let newEntry : LeaderboardEntry = {
          player;
          totalScore = score;
          wins = 1;
        };
        leaderboard.add(player, newEntry);
      };
      case (?entry) {
        let updatedEntry : LeaderboardEntry = {
          player = entry.player;
          totalScore = entry.totalScore + score;
          wins = entry.wins + 1;
        };
        leaderboard.add(player, updatedEntry);
      };
    };
  };

  public query ({ caller }) func getLeaderboard() : async [LeaderboardEntry] {
    leaderboard.values().toArray().sort(LeaderboardEntry.compareByScore);
  };

  public query ({ caller }) func getRecentMatches() : async [MatchResultView] {
    matchResults.toArray().sliceToArray(0, 10);
  };

  public query ({ caller }) func getActiveLobbies() : async [LobbyView] {
    lobbies.values().map(func(lobby) { toLobbyView(lobby) }).toArray();
  };

  func toLobbyView(lobby : Lobby) : LobbyView {
    {
      id = lobby.id;
      host = lobby.host;
      players = lobby.players.toArray();
      mode = lobby.mode;
      currentChallenge = lobby.currentChallenge;
      isActive = lobby.isActive;
    };
  };

  public query ({ caller }) func getLobby(lobbyId : Nat) : async ?LobbyView {
    switch (lobbies.get(lobbyId)) {
      case (null) { null };
      case (?lobby) { ?toLobbyView(lobby) };
    };
  };

  func interpretCommand(context : TerminalContext, commandText : Text) : TerminalOutput {
    switch (context) {
      case (#developerTest) {
        if (Text.equal(commandText, "solve")) {
          {
            lines = ["Success: Task solved.", "Congratulations!"];
            solved = true;
            context = ?debug_show (context);
          };
        } else {
          {
            lines = [
              "Welcome to the developer test!",
              "Current context: developerTest",
              "Output: " # commandText,
            ];
            solved = false;
            context = ?debug_show (context);
          };
        };
      };
      case (_) {
        {
          lines = [
            "Unknown context. Please retry.",
            "Current context: " # debug_show (context),
            "Output: " # commandText,
          ];
          solved = false;
          context = null;
        };
      };
    };
  };

  func withLobby(lobbyId : Nat, funcRef : Lobby -> TerminalOutput) : TerminalOutput {
    switch (lobbies.get(lobbyId)) {
      case (?lobby) { funcRef(lobby) };
      case (null) {
        {
          lines = [
            "Error: Lobby with ID " # lobbyId.toText() # " not found. ",
            "Please retry with valid one.",
          ];
          solved = false;
          context = ?"unknown";
        };
      };
    };
  };

  func withLobbyContext(lobbyId : Nat, funcRef : (TerminalContext, Lobby) -> TerminalOutput) : TerminalOutput {
    withLobby(lobbyId, func(lobby) { funcRef(#developerTest, lobby) });
  };

  public shared ({ caller }) func processTerminalCommand(lobbyId : Nat, commandText : Text) : async TerminalOutput {
    switch (lobbies.get(lobbyId)) {
      case (null) {
        {
          lines = [
            "Error: Lobby with ID " # lobbyId.toText() # " not found.",
            "Please create or join a valid lobby first.",
          ];
          solved = false;
          context = ?"unknown";
        };
      };
      case (?lobby) {
        if (not lobby.players.contains(caller)) {
          {
            lines = [
              "Error: You are not a member of this lobby.",
              "Please join the lobby before sending commands.",
            ];
            solved = false;
            context = ?"unknown";
          };
        } else {
          switch (lobby.mode) {
            case (#cooperative or #competitive) {
              if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
                {
                  lines = [
                    "Error: Unauthorized access.",
                    "Only authenticated users can interact with multiplayer lobbies.",
                  ];
                  solved = false;
                  context = ?"unknown";
                };
              } else {
                withLobbyContext(lobbyId, func(context, _lobby) { interpretCommand(context, commandText) });
              };
            };
            case (#solo) {
              withLobbyContext(lobbyId, func(context, _lobby) { interpretCommand(context, commandText) });
            };
          };
        };
      };
    };
  };
};
