'use client'

export default function PrintButton() {
  return (
    <div className="print:hidden flex justify-end">
      <button
        onClick={() => window.print()}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg"
      >
        Imprimer
      </button>
    </div>
  )
}
