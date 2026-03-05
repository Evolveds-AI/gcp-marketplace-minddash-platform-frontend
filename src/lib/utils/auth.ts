// export async function getCloudRunIdToken(targetAudience: string) {
//   // GoogleAuth buscará la Service Account asignada a tu servicio de Cloud Run
//   const auth = new GoogleAuth();

//   // Crea un cliente de ID Token para la audiencia específica.
//   const client = await auth.getIdTokenClient(targetAudience);

//   // Obtiene el ID Token.
//   const idToken = await client.idTokenProvider.fetchIdToken(targetAudience);

//   if (!idToken) {
//     throw new Error('No se pudo obtener el ID Token para la audiencia: ' + targetAudience);
//   }

//   console.log(`ID Token obtenido para ${targetAudience}`);
//   return idToken;
// }