// Static fallback list used if the SteamSpy API is unreachable.
// Steam appids → header art served from cdn.cloudflare.steamstatic.com.

// Known free-to-play appids in the fallback list (and common F2P titles).
export const FREE_APPIDS = new Set([
  730, 570, 440, 1172470, 1599340, 230410, 386360, 236390, 444090, 1097150,
  1085660, 578080, 304930,
]);

export const FALLBACK_TOP_GAMES = [
  { appid: 730, name: 'Counter-Strike 2', developer: 'Valve', ccu: 950000 },
  { appid: 570, name: 'Dota 2', developer: 'Valve', ccu: 600000 },
  { appid: 578080, name: 'PUBG: BATTLEGROUNDS', developer: 'KRAFTON, Inc.', ccu: 500000 },
  { appid: 1172470, name: 'Apex Legends', developer: 'Respawn', ccu: 300000 },
  { appid: 271590, name: 'Grand Theft Auto V', developer: 'Rockstar North', ccu: 180000 },
  { appid: 1599340, name: 'Lost Ark', developer: 'Smilegate RPG', ccu: 130000 },
  { appid: 359550, name: 'Tom Clancy’s Rainbow Six Siege', developer: 'Ubisoft Montreal', ccu: 90000 },
  { appid: 1085660, name: 'Destiny 2', developer: 'Bungie', ccu: 80000 },
  { appid: 252490, name: 'Rust', developer: 'Facepunch Studios', ccu: 75000 },
  { appid: 1238810, name: 'Battlefield V', developer: 'EA DICE', ccu: 18000 },
  { appid: 440, name: 'Team Fortress 2', developer: 'Valve', ccu: 90000 },
  { appid: 1245620, name: 'ELDEN RING', developer: 'FromSoftware', ccu: 110000 },
  { appid: 292030, name: 'The Witcher 3: Wild Hunt', developer: 'CD PROJEKT RED', ccu: 30000 },
  { appid: 1091500, name: 'Cyberpunk 2077', developer: 'CD PROJEKT RED', ccu: 70000 },
  { appid: 105600, name: 'Terraria', developer: 'Re-Logic', ccu: 35000 },
  { appid: 322330, name: 'Don’t Starve Together', developer: 'Klei', ccu: 30000 },
  { appid: 304930, name: 'Unturned', developer: 'Smartly Dressed Games', ccu: 30000 },
  { appid: 218620, name: 'PAYDAY 2', developer: 'OVERKILL', ccu: 18000 },
  { appid: 230410, name: 'Warframe', developer: 'Digital Extremes', ccu: 40000 },
  { appid: 386360, name: 'SMITE', developer: 'Hi-Rez Studios', ccu: 12000 },
  { appid: 393380, name: 'Squad', developer: 'Offworld Industries', ccu: 8000 },
  { appid: 381210, name: 'Dead by Daylight', developer: 'Behaviour', ccu: 60000 },
  { appid: 632360, name: 'Risk of Rain 2', developer: 'Hopoo Games', ccu: 15000 },
  { appid: 739630, name: 'Phasmophobia', developer: 'Kinetic Games', ccu: 30000 },
  { appid: 1174180, name: 'Red Dead Redemption 2', developer: 'Rockstar Games', ccu: 30000 },
  { appid: 250900, name: 'The Binding of Isaac: Rebirth', developer: 'Nicalis', ccu: 8000 },
  { appid: 413150, name: 'Stardew Valley', developer: 'ConcernedApe', ccu: 50000 },
  { appid: 367520, name: 'Hollow Knight', developer: 'Team Cherry', ccu: 12000 },
  { appid: 990080, name: 'Hogwarts Legacy', developer: 'Avalanche', ccu: 15000 },
  { appid: 1517290, name: 'Battlefield 2042', developer: 'EA DICE', ccu: 6000 },
  { appid: 814380, name: 'Sekiro: Shadows Die Twice', developer: 'FromSoftware', ccu: 6000 },
  { appid: 552520, name: 'Far Cry 5', developer: 'Ubisoft', ccu: 4000 },
  { appid: 1097150, name: 'Fall Guys', developer: 'Mediatonic', ccu: 25000 },
  { appid: 945360, name: 'Among Us', developer: 'Innersloth', ccu: 35000 },
  { appid: 588650, name: 'Dead Cells', developer: 'Motion Twin', ccu: 6000 },
  { appid: 4000, name: 'Garry’s Mod', developer: 'Facepunch', ccu: 35000 },
  { appid: 286160, name: 'Tabletop Simulator', developer: 'Berserk Games', ccu: 6000 },
  { appid: 251570, name: '7 Days to Die', developer: 'The Fun Pimps', ccu: 25000 },
  { appid: 346110, name: 'ARK: Survival Evolved', developer: 'Studio Wildcard', ccu: 30000 },
  { appid: 444090, name: 'Paladins', developer: 'Evil Mojo', ccu: 8000 },
  { appid: 236390, name: 'War Thunder', developer: 'Gaijin', ccu: 80000 },
  { appid: 8930, name: 'Sid Meier’s Civilization V', developer: 'Firaxis', ccu: 18000 },
  { appid: 289070, name: 'Sid Meier’s Civilization VI', developer: 'Firaxis', ccu: 35000 },
  { appid: 268500, name: 'XCOM 2', developer: 'Firaxis', ccu: 4000 },
  { appid: 377160, name: 'Fallout 4', developer: 'Bethesda', ccu: 22000 },
  { appid: 489830, name: 'The Elder Scrolls V: Skyrim Special Edition', developer: 'Bethesda', ccu: 22000 },
  { appid: 1086940, name: 'Baldur’s Gate 3', developer: 'Larian Studios', ccu: 95000 },
  { appid: 1938090, name: 'Call of Duty', developer: 'Activision', ccu: 200000 },
  { appid: 1604030, name: 'EA SPORTS FC 24', developer: 'EA Sports', ccu: 50000 },
  { appid: 2050650, name: 'Resident Evil 4', developer: 'Capcom', ccu: 12000 },
];

export function steamHeader(appid) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function steamCapsule(appid) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}

export function steamStorePage(appid) {
  return `https://store.steampowered.com/app/${appid}`;
}
