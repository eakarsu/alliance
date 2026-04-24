export default function AIResponseDisplay({ response }) {
  if (!response) return null

  const text = typeof response === 'string' ? response : JSON.stringify(response, null, 2)

  const renderContent = (content) => {
    const lines = content.split('\n')
    const elements = []
    let listItems = []
    let inList = false

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="mb-4 space-y-1 pl-4">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              </li>
            ))}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    const formatInline = (text) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-blue-700">$1</code>')
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!line) {
        flushList()
        continue
      }

      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h4 key={i} className="mb-2 mt-4 text-base font-semibold text-gray-800">
            {line.slice(4)}
          </h4>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h3 key={i} className="mb-3 mt-5 text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
            {line.slice(3)}
          </h3>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h2 key={i} className="mb-3 mt-5 text-xl font-bold text-gray-900">
            {line.slice(2)}
          </h2>
        )
      } else if (line.match(/^[-*]\s/)) {
        inList = true
        listItems.push(line.slice(2))
      } else if (line.match(/^\d+\.\s/)) {
        inList = true
        listItems.push(line.replace(/^\d+\.\s/, ''))
      } else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('risk') || line.toLowerCase().includes('caution')) {
        flushList()
        elements.push(
          <div key={i} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          </div>
        )
      } else if (line.toLowerCase().includes('recommendation') || line.toLowerCase().includes('suggest') || line.toLowerCase().includes('action')) {
        flushList()
        elements.push(
          <div key={i} className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          </div>
        )
      } else if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('note') || line.toLowerCase().includes('important')) {
        flushList()
        elements.push(
          <div key={i} className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          </div>
        )
      } else {
        flushList()
        elements.push(
          <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        )
      }
    }

    flushList()
    return elements
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="prose prose-sm max-w-none">
        {renderContent(text)}
      </div>
    </div>
  )
}
