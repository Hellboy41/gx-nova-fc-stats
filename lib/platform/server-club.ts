/** Identifiant du club EA de CETTE installation.
 * Une installation client utilise une base Supabase distincte et une
 * configuration serveur fixe : jamais un ID transmis par le navigateur.
 */
const configuredId = process.env.ESPORT_EA_CLUB_ID?.trim() || "1663";
if (!/^[1-9][0-9]{0,19}$/.test(configuredId)) {
  throw new Error("ESPORT_EA_CLUB_ID doit être un identifiant EA numérique positif.");
}
if (configuredId !== "1663" && process.env.ESPORT_INSTANCE_MODE !== "isolated") {
  throw new Error("Un club EA différent nécessite une installation et une base Supabase isolées (ESPORT_INSTANCE_MODE=isolated).");
}
export const CLUB_ID = configuredId;
