import { generateAppsScript } from '@/lib/apps-script'
import CopyButton from './CopyButton'
import { createClient } from '@/lib/supabase/server'

export default async function SyncPage() {
  const supabase = await createClient()
  const { data: niveaux } = await supabase
    .from('niveaux')
    .select('id, code, nom, google_sheet_id')
    .order('code')

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://VOTRE-DOMAINE.vercel.app'}/api/sync/notes`
  const syncSecret = process.env.SYNC_SECRET ?? '(non configuré — voir .env.local)'
  const appsScript = generateAppsScript(webhookUrl, syncSecret)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuration synchronisation Google Sheets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez les étapes ci-dessous pour connecter vos Google Sheets à la plateforme.
        </p>
      </div>

      {/* Étape 1 : Format des feuilles */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs mr-2">1</span>
          Format requis pour chaque feuille (onglet)
        </h2>
        <p className="text-sm text-gray-500">
          Chaque onglet de votre Google Sheet représente une matière (ECUE). La ligne 1 doit contenir exactement ces en-têtes :
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-blue-50">
                {['A - MATRICULE', 'B - NOM', 'C - PRENOM', 'D - CC1', 'E - CC2', 'F - CC3', 'G - ET', 'H - RATTRAPAGE', 'I - REPRISE'].map(h => (
                  <th key={h} className="border border-blue-100 px-3 py-2 font-semibold text-blue-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                {['DECOGEF2024001', 'AGOSSOU', 'Médard', '14', '13', '', '12', '', ''].map((v, i) => (
                  <td key={i} className="border border-gray-100 px-3 py-2 text-center text-gray-600">{v}</td>
                ))}
              </tr>
              <tr className="bg-gray-50">
                {['DECOGEF2024002', 'BAKO', 'Fatima', '11', '10', '', '9', '12', ''].map((v, i) => (
                  <td key={i} className="border border-gray-100 px-3 py-2 text-center text-gray-600">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-700">
          <strong>Important :</strong> Le nom de l&apos;onglet doit correspondre exactement au champ &quot;Feuille Google Sheet&quot; renseigné pour chaque ECUE dans l&apos;admin.
          Colonnes CC3, RATTRAPAGE et REPRISE peuvent rester vides si non utilisées.
        </div>
      </section>

      {/* Étape 2 : Lier les Google Sheets aux niveaux */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs mr-2">2</span>
          Associer chaque Google Sheet à son niveau
        </h2>
        <p className="text-sm text-gray-500">
          Copiez l&apos;ID de chaque Google Sheet (visible dans l&apos;URL : docs.google.com/spreadsheets/d/<strong>ID_ICI</strong>/edit)
          et renseignez-le dans la colonne &quot;google_sheet_id&quot; de la table <code className="bg-gray-100 px-1 rounded">niveaux</code> dans Supabase.
        </p>
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Niveau</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">ID Google Sheet configuré</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(niveaux ?? []).map(n => (
                <tr key={n.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{n.nom}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {n.google_sheet_id ?? <span className="text-amber-500 font-sans">Non configuré</span>}
                  </td>
                  <td className="px-4 py-3">
                    {n.google_sheet_id
                      ? <span className="text-green-600 text-xs font-medium">✓ Lié</span>
                      : <span className="text-gray-400 text-xs">En attente</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Étape 3 : Installer le script */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs mr-2">3</span>
          Installer le script dans chaque Google Sheet
        </h2>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Ouvrez le Google Sheet du niveau concerné</li>
          <li>Allez dans <strong>Outils &gt; Éditeur de scripts</strong></li>
          <li>Supprimez tout le contenu existant, collez le script ci-dessous</li>
          <li>Cliquez sur <strong>Enregistrer</strong> puis fermez l&apos;éditeur</li>
          <li>Répétez pour chacun des 5 Google Sheets</li>
        </ol>

        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <CopyButton text={appsScript} />
          </div>
          <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 text-xs overflow-x-auto max-h-96 leading-relaxed">
            {appsScript}
          </pre>
        </div>
      </section>

      {/* Étape 4 : Tester */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
        <h2 className="font-semibold text-gray-800">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs mr-2">4</span>
          Tester la synchronisation
        </h2>
        <p className="text-sm text-gray-500">
          Une fois le script installé, saisissez ou modifiez une note dans une cellule de colonne CC1, CC2, CC3, ET, RATTRAPAGE ou REPRISE.
          Un toast de confirmation doit apparaître en bas à droite du Google Sheet dans les 2-3 secondes.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            <p className="font-medium text-green-700">Toast vert</p>
            <p className="text-green-600 text-xs mt-1">Synchronisation réussie. La note est enregistrée et l&apos;étudiant sera notifié.</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <p className="font-medium text-red-700">Toast rouge</p>
            <p className="text-red-600 text-xs mt-1">Erreur. Vérifiez que le Google Sheet ID et le nom de la feuille sont bien configurés.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
