import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  // Definition of types from old actor
  type GameMode = {
    #solo;
    #cooperative;
    #competitive;
  };

  type UserProfile = {
    name : Text;
    gamesPlayed : Nat;
    totalScore : Nat;
  };

  type MatchResultView = {
    matchId : Nat;
    winner : ?Principal;
    scores : [(Principal, Nat)];
    mode : GameMode;
    timestamp : Int;
  };

  type Challenge = {
    id : Nat;
    name : Text;
    description : Text;
  };

  type Lobby = {
    id : Nat;
    host : Principal;
    players : Set.Set<Principal>;
    mode : GameMode;
    currentChallenge : ?Challenge;
    isActive : Bool;
  };

  // Old actor type definition
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    challenges : List.List<Challenge>;
    lobbies : Map.Map<Nat, Lobby>;
    matchResults : List.List<MatchResultView>;
    leaderboard : Map.Map<Principal, { player : Principal; totalScore : Nat; wins : Nat }>;
    nextLobbyId : Nat;
    nextMatchId : Nat;
  };

  // New actor type is identical as no persistent Terminal state needed
  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
