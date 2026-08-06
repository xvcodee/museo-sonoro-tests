const narrations = {
  bienvenida: 'Bienvenido a SONORA, el Museo Digital de la Percepción Sonora. Este recorrido propone habitar el sonido antes de nombrarlo. Cada sala reúne frecuencias, memorias y silencios que transforman nuestra forma de percibir.',
  coleccion: 'En esta colección hay cuatro formas de oír. El pulso de la ciudad reúne tramas urbanas, motores y voces en tránsito. Memoria en espiral conserva voces que persisten en el tiempo. La piel del sonido explora vibración, cuerpo y materia. Silencios compartidos invita a escuchar aquello que deja espacio.',
  'escucha-activa': 'Tomá un minuto y dejá que suene. Esta sala presenta una pieza generativa que cambia con vos. Elegí una textura y ajustá la frecuencia para crear tu propia deriva sonora. Para una experiencia más íntima, usá auriculares.',
  silencios: 'El silencio también se toca. Esta sala es un instrumento colectivo de nueve notas. Elegí una tonalidad, mové el volumen y llevá la distorsión al límite o dejala respirar. En SONORA, el jurador escucha antes de decidir: no mide si un sonido es correcto, sino qué memoria, cuerpo o paisaje activa en quien lo oye.',
  resonancia: 'Hacé sonar el espacio. Cuatro cuerpos suspendidos guardan una nota, un color y una distancia. Combinálos para componer un pequeño paisaje propio. La sala escucha con vos.',
  fonoteca: 'Esta es la fonoteca de SONORA. Aquí podés elegir el pulso del museo con obras que acompañan el recorrido. La obra elegida seguirá sonando mientras explorás las demás salas.',
  archivo: 'Entraste al archivo digital de SONORA. Dieciséis obras destacadas forman parte de una colección en crecimiento: fragmentos de ciudad, memoria, cuerpo y paisaje que enseñan distintas maneras de escuchar.',
  afectivo: 'En el Archivo afectivo, el sonido no impone lo que sentís: propone un clima. Elegí una escena de miedo, felicidad, tristeza o calma, y observá cómo cambia tu propia percepción.',
  mirada: 'En SONORA, escuchar es prestar atención a lo que una imagen no alcanza a decir. No organizamos sonidos para clasificarlos: los reunimos para dejar que abran memoria, conversación y presencia.',
  metodo: 'El método de SONORA parte de una pregunta simple: ¿qué cambia cuando escuchamos sin apurarnos a reconocer? Desde ahí reunimos registros, cuerpos, paisajes y gestos cotidianos. Cada obra es una invitación a participar, no una respuesta cerrada.',
  umbral: 'Este museo no busca enseñar una única forma de oír. Quiere ofrecer un umbral: una pequeña interrupción para que cada visitante encuentre una relación propia con lo que suena.'
};

export default {
  async fetch(request) {
    if (request.method !== 'GET') return Response.json({ error: 'Método no permitido.' }, { status: 405 });
    const room = new URL(request.url).searchParams.get('room');
    const input = narrations[room];
    if (!input) return Response.json({ error: 'Sala no encontrada.' }, { status: 404 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: 'La voz IA no fue configurada todavía.' }, { status: 503 });

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: 'marin',
          input,
          instructions: 'Hablá en español rioplatense con una voz humana, cálida y serena. Sos el narrador de un museo sonoro contemporáneo. Mantené un ritmo pausado, natural y expresivo. Evitá cualquier tono robótico, publicitario o excesivamente dramático.',
          response_format: 'mp3',
          speed: .94
        })
      });
      if (!response.ok) return Response.json({ error: 'No se pudo generar la narración.' }, { status: response.status });
      return new Response(response.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, s-maxage=86400, max-age=3600' } });
    } catch (_) {
      return Response.json({ error: 'La voz IA no respondió.' }, { status: 502 });
    }
  }
};
