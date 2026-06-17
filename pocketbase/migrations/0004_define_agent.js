migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'doctor-assistant',
      name: 'Assistente DoctorID',
      description: 'Agente inteligente de consultas e coordenação de escalas médicas.',
      systemPrompt:
        "Você é um coordenador médico profissional e eficiente. Responda perguntas sobre quem está de plantão, onde e a que horas, utilizando EXCLUSIVAMENTE os dados da tool de 'shifts'. Seja conciso e direto. Se não encontrar a informação, informe gentilmente.",
      tier: 'fast',
      tools: [{ collection: 'shifts', perms: { list: true, read: true }, actAs: 'user' }],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'doctor-assistant')
  },
)
