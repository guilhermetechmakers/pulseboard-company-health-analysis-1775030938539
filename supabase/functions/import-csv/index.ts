import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CsvRow {
  [key: string]: string
}

function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.split('\n').map((line) => line.trim()).filter(Boolean)
  const headers = lines[0]?.split(',').map((header) => header.trim()) ?? []
  const rows = lines.slice(1)
  return (rows ?? []).map((line) => {
    const values = line.split(',').map((value) => value.trim())
    return headers.reduce<CsvRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? ''
      return accumulator
    }, {})
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const companyId = body?.companyId ?? ''
    const fileName = body?.fileName ?? 'upload.csv'
    const csvContent = body?.content ?? ''
    const mapping = body?.mapping ?? {}

    if (!companyId || !csvContent) {
      return new Response(JSON.stringify({ error: 'companyId and CSV content are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = parseCsv(csvContent)
    const safeRows = Array.isArray(rows) ? rows : []

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    await supabase.from('csv_uploads').insert({
      company_id: companyId,
      file_name: fileName,
      status: 'completed',
      rows_processed: safeRows.length,
      mapping,
      completed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ ok: true, rowsProcessed: safeRows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
