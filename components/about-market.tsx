const cases = [
  {
    place: "Oro Verde · Entre Ríos",
    title: "Pagado, pero todavía en el depósito",
    detail: "Clientes denunciaron que no podían retirar sus acopios. Uno afirmó que seguía esperando entre el 60% y el 70% de los materiales abonados.",
    lesson: "Pagar no equivale a recibir.",
    source: "Análisis · 16 mar 2026",
    url: "https://www.analisisdigital.com.ar/locales/2026/03/16/clientes-reclaman-materiales-comprados-y-acopiados-en-un-corralon-de-oro-verde",
  },
  {
    place: "Chivilcoy · Buenos Aires",
    title: "El proveedor cierra. El acopio queda pendiente.",
    detail: "Tras el cierre de Grupo Renovar, compradores reclamaron mercadería ya pagada. Según los testimonios publicados, la firma habría cobrado hasta tres días antes de cerrar.",
    lesson: "La confianza sola no protege el anticipo.",
    source: "La Trocha · 19 abr 2026",
    url: "https://www.latrochadigital.com.ar/2026/04/19/cierra-un-corralon-y-deja-un-tendal-de-damnificados/",
  },
  {
    place: "Quilmes · Buenos Aires",
    title: "Una factura prueba el pago. ¿Y la entrega?",
    detail: "Una disputa por ocho bolsas de cemento llegó a la Justicia. La empresa no pudo acreditar el retiro: faltaban remitos y registros de entrega.",
    lesson: "Cada recepción necesita evidencia.",
    source: "Infobae · 12 feb 2026",
    url: "https://www.infobae.com/judiciales/2026/02/12/construia-su-casa-y-decidio-acopiar-cemento-denuncias-aumentos-y-un-fallo-judicial-contra-el-corralon/",
  },
];

// Copy for layout review only; replace with approved interview transcripts.
const interview = [
  {
    topic: "Anticipos",
    question: "¿Por qué adelantan dinero antes de recibir los materiales?",
    answer: "“Para cerrar precio y reservar disponibilidad. Pero entre que pagamos y llega el material pueden pasar semanas: en ese tiempo la plata ya salió y la obra todavía no recibió nada.”",
  },
  {
    topic: "Incumplimientos",
    question: "¿Qué pasa cuando un proveedor se demora o entrega menos?",
    answer: "“Hay que perseguirlo por teléfono y reorganizar la obra. A veces compramos de nuevo en otro lado para no frenar a la cuadrilla, mientras seguimos reclamando lo que ya pagamos.”",
  },
  {
    topic: "Recepción en obra",
    question: "¿Cómo comprueban qué llegó antes de aprobar el pago?",
    answer: "“El encargado recibe, manda una foto del remito y administración lo cruza con el pedido. Si llegó una parte o vino algo distinto, terminamos reconstruyendo todo entre mensajes.”",
  },
  {
    topic: "Fondos protegidos",
    question: "¿Usarían un sistema que libere el dinero contra entrega?",
    answer: "“Sí, si el proveedor ve que los fondos están reservados y cobra cuando conformamos lo recibido. Necesitamos liberar por entregas parciales y acordar un anticipo si hay fabricación a medida.”",
  },
  {
    topic: "Devolución y control",
    question: "¿Qué tendría que pasar si la entrega no se cumple?",
    answer: "“Queremos un plazo claro, poder dejar asentado el reclamo y recuperar el saldo que no se ejecutó según lo pactado. Y que quede registrado quién recibió, quién aprobó y cuánto se liberó.”",
  },
];

export function AboutMarket() {
  return <>
    <section className="about-market" id="el-mercado" aria-labelledby="about-market-title">
      <header className="about-research-heading">
        <span className="about-section-number">01</span>
        <div><p className="about-section-label">El mercado</p><h2 id="about-market-title">La obra paga antes.<br/><span>El riesgo llega después.</span></h2></div>
      </header>
      <p className="about-market-lead">El acopio permite pagar hoy y recibir a medida que avanza la obra. El problema aparece cuando el dinero ya está en manos del proveedor y la entrega sigue pendiente.</p>
      <div className="about-market-problems">
        <article><span>DINERO</span><h3>Anticipos sin respaldo de entrega</h3><p>El pago se completa antes de saber si el material llegará en tiempo, cantidad y condiciones.</p></article>
        <article><span>CONTINUIDAD</span><h3>La demora se traslada a la obra</h3><p>Un faltante obliga a reprogramar tareas, buscar alternativas y volver a coordinar la descarga.</p></article>
        <article><span>EVIDENCIA</span><h3>Reclamar exige reconstruir todo</h3><p>Facturas, remitos y mensajes dispersos dificultan conciliar lo pagado con lo realmente recibido.</p></article>
      </div>
      <div className="about-case-heading"><h3>El problema, en casos concretos</h3><p>Casos publicados relevados en el research del equipo.</p></div>
      <div className="about-market-cases">
        {cases.map(item => <article className="panel about-case" key={item.place}>
          <span className="about-case-place">{item.place}</span><h4>{item.title}</h4><p>{item.detail}</p><strong>{item.lesson}</strong>
          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.source} <span aria-hidden="true">↗</span></a>
        </article>)}
      </div>
      <p className="about-research-scope">Estos casos corresponden a compradores particulares; no permiten medir la frecuencia ni las pérdidas de las desarrolladoras.</p>
      <div className="about-market-answer"><span aria-hidden="true">↳</span><div><h3>La oportunidad: conectar el dinero con la entrega verificada.</h3><p>Obra Clara propone reservar fondos en un smart contract, liberar lo que corresponde contra recepción y gestionar el saldo pendiente según las condiciones acordadas.</p></div></div>
    </section>
    <section className="about-interviews" id="entrevistas" aria-labelledby="about-interview-title">
      <header className="about-research-heading">
        <span className="about-section-number">02</span>
        <div><p className="about-section-label">Desarrolladoras · compras y obra</p><h2 id="about-interview-title">Cinco preguntas.<br/><span>Lo que necesitamos entender.</span></h2></div>
      </header>
      <div className="about-interview-context"><span>Entrevista ilustrativa</span><p>Respuestas provisorias para revisar el contenido; se reemplazarán por las entrevistas reales.</p></div>
      <ol className="about-chat-list">
        {interview.map((item,index) => <li key={item.topic}>
          <div className="about-chat-topic"><span>{String(index+1).padStart(2,"0")}</span>{item.topic}</div>
          <div className="about-chat-question"><span>Obra Clara pregunta</span><p>{item.question}</p></div>
          <blockquote className="about-chat-answer"><span>Respuesta · desarrolladora</span><p>{item.answer}</p></blockquote>
        </li>)}
      </ol>
    </section>
  </>;
}
