const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { uploadPDFFile } = require('../AWS/StorageS3');
const HistoriaClinica = require('../models/HistoriaClinica');
const Paciente = require('../models/Patients');
const Doctor = require('../models/Doctor');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const PdfPrinter = require('pdfmake/src/printer');
const Cita = require('../models/Cita');
function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';

  // Crear una nueva fecha usando el constructor Date con la fecha original
  // Esto preservará la fecha exacta sin ajustes de zona horaria
  const fechaObj = new Date(fecha);

  // Obtener los componentes de la fecha en UTC
  const dia = fechaObj.getUTCDate().toString().padStart(2, '0');
  const mes = (fechaObj.getUTCMonth() + 1).toString().padStart(2, '0');
  const anio = fechaObj.getUTCFullYear();

  // Retornar la fecha formateada
  return `${dia}/${mes}/${anio}`;
}

async function crearPDFHistoriaClinica(historiaClinica, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {

      // Asegurarse de que diagnosticos sea un array
      if (typeof historiaClinica.diagnosticos === 'string') {
        try {
          historiaClinica.diagnosticos = JSON.parse(historiaClinica.diagnosticos);
          console.log("Diagnósticos parseados correctamente");
        } catch (e) {
          console.error("Error al parsear diagnósticos:", e);
          historiaClinica.diagnosticos = [];
        }
      }

      // Verificar si hay datos de signos vitales
      if (!historiaClinica.signosVitales) {
        historiaClinica.signosVitales = {
          tasMming: historiaClinica.tasMming,
          tad: historiaClinica.tad,
          fcMin: historiaClinica.fcMin,
          frMin: historiaClinica.frMin,
          temperatura: historiaClinica.temperatura,
          pesoKg: historiaClinica.pesoKg,
          tallaCm: historiaClinica.tallaCm,
          imc: historiaClinica.imc,
          perimetroCefalico: historiaClinica.perimetroCefalico,
          perimetroAbdominal: historiaClinica.perimetroAbdominal,
          saturacionOxigeno: historiaClinica.saturacionOxigeno,
          glucometria: historiaClinica.glucometria
        };
      }

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor.url_firma) {
        try {
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);

      // Buscar la cita y hacer populate al patientId
      const pacienteCita = await Cita.findById(historiaClinica.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      const content = [
        // Añadir logos y datos de la institución en la parte superior
        {
          columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
            {
              width: logoWidth,
              image: logoPath,
              fit: logoSize,
              alignment: 'center',
              margin: logoMargin
            }
          ] : [
            {
              width: logoWidth,
              image: logoPath,
              fit: logoSize,
              alignment: 'center',
              margin: logoMargin
            },
            {
              width: '*',
              stack: [
                { text: hospitalName, style: 'institutionName' },
                hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
                hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
                hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
                hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
              ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
              alignment: 'left',
              margin: [0, 3, 0, 0]
            },
            {
              width: logoWidth,
              image: path.join(__dirname, 'logobosque.jpg'),
              fit: logoSize2,
              alignment: 'center',
              margin: logoMargin
            }
          ],
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },

        // Título principal
        { text: 'HISTORIA CLÍNICA', style: 'header', margin: [0, 0, 0, 10] },

        // Tabla principal que contiene todas las secciones
        {
          table: {
            headerRows: 0,
            widths: ['*'],
            body: [
              // INFORMACIÓN DE LA CONSULTA
              [{
                table: {
                  widths: ['*'],
                  body: [
                    [{ text: 'INFORMACIÓN DE LA CONSULTA', style: 'sectionHeader' }],
                    [{
                      table: {
                        widths: ['25%', '25%', '25%', '25%'],
                        body: [
                          [
                            { text: 'Fecha de registro', style: 'tableHeader' },
                            { text: historiaClinica.fechaRegistro ? moment(historiaClinica.fechaRegistro).format('DD/MM/YYYY') : 'No registrada' },
                            { text: 'Tipo de actividad', style: 'tableHeader' },
                            { text: historiaClinica.tipoActividad || 'No registrado' }
                          ],
                          [
                            { text: 'Fecha de cita', style: 'tableHeader' },
                            { text: historiaClinica.fechaCita ? formatearFecha(historiaClinica.fechaCita) : 'No registrada' },
                            { text: 'Hora de cita', style: 'tableHeader' },
                            { text: historiaClinica.horaCita || 'No registrada' }
                          ],
                          [
                            { text: 'Tipo de cita', style: 'tableHeader' },
                            { text: historiaClinica.tipoCita || 'No registrado' },
                            { text: 'Pagador', style: 'tableHeader' },
                            { text: historiaClinica.pagador || 'No registrado' }
                          ]
                        ]
                      },
                      layout: {
                        hLineWidth: function (i, node) { return 0.5; },
                        vLineWidth: function (i, node) { return 0.5; },
                        hLineColor: function (i, node) { return '#aaa'; },
                        vLineColor: function (i, node) { return '#aaa'; }
                      }
                    }]
                  ]
                },
                layout: 'headerLineOnly'
              }],

              // MOTIVO DE CONSULTA Y ACOMPAÑAMIENTO
              [{
                table: {
                  widths: ['*'],
                  body: [
                    [{ text: 'MOTIVO DE CONSULTA Y ACOMPAÑAMIENTO', style: 'sectionHeader' }],
                    [{
                      table: {
                        widths: ['25%', '75%'],
                        body: [
                          [
                            { text: 'Motivo de consulta', style: 'tableHeader' },
                            { text: historiaClinica.motivoConsulta || 'No registrado' }
                          ],
                          [
                            { text: 'Motivo que origina la atención', style: 'tableHeader' },
                            { text: historiaClinica.motivoAtencion || 'No registrado' }
                          ],
                          [
                            { text: 'Acompañamiento', style: 'tableHeader' },
                            { text: historiaClinica.acompanamientoEnConsulta || 'No registrado' }
                          ]
                        ]
                      },
                      layout: {
                        hLineWidth: function (i, node) { return 0.5; },
                        vLineWidth: function (i, node) { return 0.5; },
                        hLineColor: function (i, node) { return '#aaa'; },
                        vLineColor: function (i, node) { return '#aaa'; }
                      }
                    }]
                  ]
                },
                layout: 'headerLineOnly'
              }],

              // INFORMACIÓN DEL PACIENTE
              [{
                table: {
                  widths: ['*'],
                  body: [
                    [{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader' }],
                    [{
                      table: {
                        widths: ['25%', '25%', '25%', '25%'],
                        body: [
                          [
                            { text: 'Nombre completo', style: 'tableHeader' },
                            { text: `${paciente.firstName || ''} ${paciente.lastName || ''}`, colSpan: 3 },
                            { text: 'Aseguradora', style: 'tableHeader' },
                            { text: historiaClinica.paciente.aseguradora || 'No registrado' }
                          ],
                          [
                            { text: 'EPS', style: 'tableHeader' },
                            { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
                            {},
                            {}
                          ],
                          [
                            { text: 'Grupo sanguíneo', style: 'tableHeader' },
                            { text: historiaClinica.paciente.grupoSanguineo || 'No registrado' },
                            { text: 'Rh', style: 'tableHeader' },
                            { text: historiaClinica.paciente.rh || 'No registrado' }
                          ],
                          [
                            { text: 'Tipo de identificación', style: 'tableHeader' },
                            { text: paciente.idType || 'No registrado' },
                            { text: 'Número de identificación', style: 'tableHeader' },
                            { text: paciente.idNumber || 'No registrado' }
                          ],
                          [
                            { text: 'Fecha de nacimiento', style: 'tableHeader' },
                            { text: paciente.birthDate ? moment(paciente.birthDate).format('DD/MM/YYYY') : 'No registrada' },
                            { text: 'Género', style: 'tableHeader' },
                            { text: paciente.gender || 'No registrado' }
                          ],
                          [
                            { text: 'Teléfono', style: 'tableHeader' },
                            { text: paciente.phone || 'No registrado' },
                            { text: 'Email', style: 'tableHeader' },
                            { text: paciente.email || 'No registrado' }
                          ]
                        ]
                      },
                      layout: {
                        hLineWidth: function (i, node) { return 0.5; },
                        vLineWidth: function (i, node) { return 0.5; },
                        hLineColor: function (i, node) { return '#aaa'; },
                        vLineColor: function (i, node) { return '#aaa'; }
                      }
                    }]
                  ]
                },
                layout: 'headerLineOnly'
              }],

              // PROFESIONAL DE LA SALUD
              [{
                table: {
                  widths: ['*'],
                  body: [
                    [{ text: 'PROFESIONAL DE LA SALUD', style: 'sectionHeader' }],
                    [{
                      table: {
                        widths: ['25%', '25%', '25%', '25%'],
                        body: [
                          [
                            { text: 'Nombre', style: 'tableHeader' },
                            { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
                            { text: 'Especialidad', style: 'tableHeader' },
                            { text: doctor.especialidad || 'No registrada' }
                          ]
                        ]
                      },
                      layout: {
                        hLineWidth: function (i, node) { return 0.5; },
                        vLineWidth: function (i, node) { return 0.5; },
                        hLineColor: function (i, node) { return '#aaa'; },
                        vLineColor: function (i, node) { return '#aaa'; }
                      }
                    }]
                  ]
                },
                layout: 'headerLineOnly'
              }]
            ]
          },
          layout: {
            hLineWidth: function (i, node) {
              return 0.5;
            },
            vLineWidth: function (i, node) {
              return 0.5;
            },
            hLineColor: function (i, node) {
              return '#aaa';
            },
            vLineColor: function (i, node) {
              return '#aaa';
            },
            paddingLeft: function (i, node) { return 4; },
            paddingRight: function (i, node) { return 4; },
            paddingTop: function (i, node) { return 2; },
            paddingBottom: function (i, node) { return 2; }
          }
        }
      ];

      // Añadir ANAMNESIS si hay datos
      if (historiaClinica.enfermedadActual || historiaClinica.resultadosParaclinicos) {
        const anamnesisBody = [];

        if (historiaClinica.enfermedadActual) {
          anamnesisBody.push([
            { text: 'Enfermedad actual', style: 'tableHeader' },
            { text: historiaClinica.enfermedadActual }
          ]);
        }

        if (historiaClinica.resultadosParaclinicos) {
          anamnesisBody.push([
            { text: 'Resultados paraclínicos', style: 'tableHeader' },
            { text: historiaClinica.resultadosParaclinicos }
          ]);
        }

        // En lugar de intentar acceder a content[1].table.body, añade directamente al array content
        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'ANAMNESIS', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['25%', '75%'],
                  body: anamnesisBody
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir ANTECEDENTES si hay datos
      if (historiaClinica.antecedentes && historiaClinica.antecedentes.length > 0) {
        const antecedentesRows = [
          [
            { text: 'Tipo', style: 'tableHeader' },
            { text: 'Presente', style: 'tableHeader' },
            { text: 'Descripción', style: 'tableHeader' }
          ]
        ];

        historiaClinica.antecedentes.forEach(antecedente => {
          antecedentesRows.push([
            { text: antecedente.tipo || 'No especificado' },
            { text: antecedente.personalCheck || 'No' },
            { text: antecedente.personalDescripcion || 'Sin descripción' }
          ]);
        });

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'ANTECEDENTES', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['30%', '10%', '60%'],
                  body: antecedentesRows
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir ANTECEDENTES FAMILIARES Y PSICOSOCIALES si hay datos
      if (historiaClinica.familiares || historiaClinica.psicosociales) {
        const famPsicoBody = [];

        if (historiaClinica.familiares) {
          famPsicoBody.push([
            { text: 'Antecedentes familiares', style: 'tableHeader' },
            { text: historiaClinica.familiares }
          ]);
        }

        if (historiaClinica.psicosociales) {
          famPsicoBody.push([
            { text: 'Antecedentes psicosociales', style: 'tableHeader' },
            { text: historiaClinica.psicosociales }
          ]);
        }

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'ANTECEDENTES FAMILIARES Y PSICOSOCIALES', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['25%', '75%'],
                  body: famPsicoBody
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir ANTECEDENTES GINECOOBSTÉTRICOS si hay datos y el paciente es femenino
      if (historiaClinica.ginecoobstetricos &&
        historiaClinica.ginecoobstetricos.length > 0 &&
        paciente.gender === 'femenino') {

        const datosGineco = historiaClinica.ginecoobstetricos[0];

        // Verificar si hay al menos un dato relevante
        const hayDatosGineco = datosGineco.g || datosGineco.p || datosGineco.a ||
          datosGineco.c || datosGineco.v || datosGineco.m ||
          datosGineco.fur || datosGineco.fup || datosGineco.fpp ||
          historiaClinica.planificacion || historiaClinica.ciclos;

        if (hayDatosGineco) {
          const ginecoBody = [
            [
              { text: 'G (Gestaciones)', style: 'tableHeader' },
              { text: datosGineco.g || 'No registrado' },
              { text: 'P (Partos)', style: 'tableHeader' },
              { text: datosGineco.p || 'No registrado' }
            ],
            [
              { text: 'A (Abortos)', style: 'tableHeader' },
              { text: datosGineco.a || 'No registrado' },
              { text: 'C (Cesáreas)', style: 'tableHeader' },
              { text: datosGineco.c || 'No registrado' }
            ],
            [
              { text: 'V (Vivos)', style: 'tableHeader' },
              { text: datosGineco.v || 'No registrado' },
              { text: 'M (Muertos)', style: 'tableHeader' },
              { text: datosGineco.m || 'No registrado' }
            ],
            [
              { text: 'FUR (Fecha última regla)', style: 'tableHeader' },
              { text: datosGineco.fur ? formatearFecha(datosGineco.fur) : 'No registrada' },
              { text: 'FUP (Fecha último parto)', style: 'tableHeader' },
              { text: datosGineco.fup ? formatearFecha(datosGineco.fup) : 'No registrada' }
            ]
          ];

          if (datosGineco.fpp) {
            ginecoBody.push([
              { text: 'FPP (Fecha probable de parto)', style: 'tableHeader' },
              { text: formatearFecha(datosGineco.fpp), colSpan: 3 },
              {},
              {}
            ]);
          }

          if (historiaClinica.planificacion) {
            ginecoBody.push([
              { text: 'Planificación', style: 'tableHeader' },
              { text: historiaClinica.planificacion, colSpan: 3 },
              {},
              {}
            ]);
          }

          if (historiaClinica.ciclos) {
            ginecoBody.push([
              { text: 'Ciclos', style: 'tableHeader' },
              { text: historiaClinica.ciclos, colSpan: 3 },
              {},
              {}
            ]);
          }

          content.push({
            table: {
              widths: ['*'],
              body: [
                [{ text: 'ANTECEDENTES GINECOOBSTÉTRICOS', style: 'sectionHeader' }],
                [{
                  table: {
                    widths: ['25%', '25%', '25%', '25%'],
                    body: ginecoBody
                  },
                  layout: {
                    hLineWidth: function (i, node) { return 0.5; },
                    vLineWidth: function (i, node) { return 0.5; },
                    hLineColor: function (i, node) { return '#aaa'; },
                    vLineColor: function (i, node) { return '#aaa'; }
                  }
                }]
              ]
            },
            layout: 'headerLineOnly'
          });
        }
      }

      // Añadir REVISIÓN POR SISTEMAS si hay datos
      if (historiaClinica.sistemas && historiaClinica.sistemas.length > 0) {
        const sistemasRows = [
          [
            { text: 'Sistema', style: 'tableHeader' },
            { text: 'Selección', style: 'tableHeader' },
            { text: 'Observaciones', style: 'tableHeader' }
          ]
        ];

        historiaClinica.sistemas.forEach(sistema => {
          sistemasRows.push([
            { text: sistema.sistema || 'No especificado' },
            { text: sistema.seleccion || 'No' },
            { text: sistema.observaciones || 'Sin observaciones' }
          ]);
        });

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'REVISIÓN POR SISTEMAS', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['30%', '10%', '60%'],
                  body: sistemasRows
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir EXAMEN FÍSICO si hay datos
      if (historiaClinica.estadoDeConciencia || historiaClinica.equiposSignos || historiaClinica.inspeccionGeneral) {
        const examenFisicoBody = [];

        if (historiaClinica.estadoDeConciencia) {
          examenFisicoBody.push([
            { text: 'Estado de conciencia', style: 'tableHeader' },
            { text: historiaClinica.estadoDeConciencia }
          ]);
        }

        if (historiaClinica.equiposSignos) {
          examenFisicoBody.push([
            { text: 'Equipos de signos', style: 'tableHeader' },
            { text: historiaClinica.equiposSignos }
          ]);
        }

        if (historiaClinica.inspeccionGeneral) {
          examenFisicoBody.push([
            { text: 'Inspección general', style: 'tableHeader' },
            { text: historiaClinica.inspeccionGeneral }
          ]);
        }

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'EXAMEN FÍSICO', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['25%', '75%'],
                  body: examenFisicoBody
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir SIGNOS VITALES si hay datos
      if (historiaClinica.equiposSignos === 'Si' &&
        (historiaClinica.signosVitales.tasMming || historiaClinica.signosVitales.tad ||
          historiaClinica.signosVitales.fcMin || historiaClinica.signosVitales.frMin ||
          historiaClinica.signosVitales.temperatura || historiaClinica.signosVitales.saturacionOxigeno ||
          historiaClinica.signosVitales.glucometria || historiaClinica.signosVitales.pesoKg ||
          historiaClinica.signosVitales.tallaCm || historiaClinica.signosVitales.imc ||
          historiaClinica.signosVitales.perimetroCefalico || historiaClinica.signosVitales.perimetroAbdominal)) {

        const signosVitalesBody = [];
        const sv = historiaClinica.signosVitales;

        // Primera fila: Presión arterial, frecuencia cardíaca y respiratoria
        if (sv.tasMming || sv.tad || sv.fcMin || sv.frMin) {
          signosVitalesBody.push([
            { text: 'Presión arterial (mmHg)', style: 'tableHeader' },
            { text: sv.tasMming ? sv.tasMming + '/' + (sv.tad || '') : 'No registrada' },
            { text: 'Frecuencia cardíaca (lpm)', style: 'tableHeader' },
            { text: sv.fcMin || 'No registrada' }
          ]);

          signosVitalesBody.push([
            { text: 'Frecuencia respiratoria (rpm)', style: 'tableHeader' },
            { text: sv.frMin || 'No registrada' },
            { text: 'Temperatura (°C)', style: 'tableHeader' },
            { text: sv.temperatura || 'No registrada' }
          ]);
        }

        // Segunda fila: Saturación y glucometría
        if (sv.saturacionOxigeno || sv.glucometria) {
          signosVitalesBody.push([
            { text: 'Saturación de oxígeno (%)', style: 'tableHeader' },
            { text: sv.saturacionOxigeno || 'No registrada' },
            { text: 'Glucometría (mg/dl)', style: 'tableHeader' },
            { text: sv.glucometria || 'No registrada' }
          ]);
        }

        // Tercera fila: Peso, talla e IMC
        if (sv.pesoKg || sv.tallaCm || sv.imc) {
          signosVitalesBody.push([
            { text: 'Peso (kg)', style: 'tableHeader' },
            { text: sv.pesoKg || 'No registrado' },
            { text: 'Talla (cm)', style: 'tableHeader' },
            { text: sv.tallaCm || 'No registrada' }
          ]);

          signosVitalesBody.push([
            { text: 'IMC (kg/m²)', style: 'tableHeader' },
            { text: sv.imc || 'No registrado' },
            { text: '', style: 'tableHeader' },
            { text: '' }
          ]);
        }

        // Cuarta fila: Perímetros
        if (sv.perimetroCefalico || sv.percentilPesoTalla) {
          signosVitalesBody.push([
            { text: 'Perímetro cefálico (cm)', style: 'tableHeader' },
            { text: sv.perimetroCefalico || 'No registrado' },
            { text: 'Percentil Peso/Talla', style: 'tableHeader' },
            { text: sv.percentilPesoTalla || 'No registrado' }
          ]);
        }

        if (signosVitalesBody.length > 0) {
          content.push({
            table: {
              widths: ['*'],
              body: [
                [{ text: 'SIGNOS VITALES', style: 'sectionHeader' }],
                [{
                  table: {
                    widths: ['25%', '25%', '25%', '25%'],
                    body: signosVitalesBody
                  },
                  layout: {
                    hLineWidth: function (i, node) { return 0.5; },
                    vLineWidth: function (i, node) { return 0.5; },
                    hLineColor: function (i, node) { return '#aaa'; },
                    vLineColor: function (i, node) { return '#aaa'; }
                  }
                }]
              ]
            },
            layout: 'headerLineOnly'
          });
        }
      }

      // Añadir ALERTAS Y ALERGIAS si hay datos
      if (historiaClinica.alertas || historiaClinica.alergias) {
        const alertasAlergiasBody = [];

        if (historiaClinica.alertas) {
          alertasAlergiasBody.push([
            { text: 'Alertas', style: 'tableHeader' },
            { text: historiaClinica.alertas }
          ]);
        }

        if (historiaClinica.alergias) {
          alertasAlergiasBody.push([
            { text: 'Alergias', style: 'tableHeader' },
            { text: historiaClinica.alergias }
          ]);
        }

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'ALERTAS Y ALERGIAS', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['25%', '75%'],
                  body: alertasAlergiasBody
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir DIAGNÓSTICOS si hay datos
      if (historiaClinica.diagnosticos && historiaClinica.diagnosticos.length > 0) {
        const diagnosticosRows = [
          [
            { text: 'Código', style: 'tableHeader' },
            { text: 'Nombre', style: 'tableHeader' },
            { text: 'Tipo', style: 'tableHeader' },
            { text: 'Relacionado', style: 'tableHeader' }
          ]
        ];

        historiaClinica.diagnosticos.forEach(diagnostico => {
          diagnosticosRows.push([
            { text: diagnostico.codigo || 'No especificado' },
            { text: diagnostico.nombre || 'No especificado' },
            { text: diagnostico.tipo || 'No especificado' },
            { text: diagnostico.relacionado || 'No' }
          ]);
        });

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'DIAGNÓSTICOS', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['15%', '45%', '20%', '20%'],
                  body: diagnosticosRows
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir PLAN DE MANEJO si hay datos
      if (historiaClinica.analisisyplan || historiaClinica.recomendaciones) {
        const planManejoBody = [];

        if (historiaClinica.analisisyplan) {
          planManejoBody.push([
            { text: 'Análisis y plan', style: 'tableHeader' },
            { text: historiaClinica.analisisyplan }
          ]);
        }

        if (historiaClinica.recomendaciones) {
          planManejoBody.push([
            { text: 'Recomendaciones', style: 'tableHeader' },
            { text: historiaClinica.recomendaciones }
          ]);
        }

        content.push({
          table: {
            widths: ['*'],
            body: [
              [{ text: 'PLAN DE MANEJO', style: 'sectionHeader' }],
              [{
                table: {
                  widths: ['25%', '75%'],
                  body: planManejoBody
                },
                layout: {
                  hLineWidth: function (i, node) { return 0.5; },
                  vLineWidth: function (i, node) { return 0.5; },
                  hLineColor: function (i, node) { return '#aaa'; },
                  vLineColor: function (i, node) { return '#aaa'; }
                }
              }]
            ]
          },
          layout: 'headerLineOnly'
        });
      }

      // Añadir EXAMEN MÉDICO DETALLADO si hay datos
      if (historiaClinica.examenMedico) {
        const examenMedicoBody = [];

        // Verificar cada campo del examen médico y añadirlo si existe
        if (historiaClinica.examenMedico.toraxCardioVascular) {
          examenMedicoBody.push([
            { text: 'Tórax y Sistema Cardiovascular', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.toraxCardioVascular }
          ]);
        }

        if (historiaClinica.examenMedico.abdomen) {
          examenMedicoBody.push([
            { text: 'Abdomen', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.abdomen }
          ]);
        }

        if (historiaClinica.examenMedico.genitales) {
          examenMedicoBody.push([
            { text: 'Genitales', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.genitales }
          ]);
        }

        if (historiaClinica.examenMedico.extremidades) {
          examenMedicoBody.push([
            { text: 'Extremidades', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.extremidades }
          ]);
        }
        if (historiaClinica.examenMedico.pielFaneras) {
          examenMedicoBody.push([
            { text: 'Piel y Faneras', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.pielFaneras }
          ]);
        }
        if (historiaClinica.examenMedico.cabezaCuello) {
          examenMedicoBody.push([
            { text: 'Cabeza y Cuello', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.cabezaCuello }
          ]);
        }


        if (historiaClinica.examenMedico.neurologico) {
          examenMedicoBody.push([
            { text: 'Neurológico', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.neurologico }
          ]);
        }
        if (historiaClinica.examenMedico.examenMental) {
          examenMedicoBody.push([
            { text: 'Examen Mental', style: 'tableHeader' },
            { text: historiaClinica.examenMedico.examenMental }
          ]);
        }

        // Solo añadir la sección si hay al menos un campo con datos
        if (examenMedicoBody.length > 0) {
          content.push({
            table: {
              widths: ['*'],
              body: [
                [{ text: 'EXAMEN MÉDICO DETALLADO', style: 'sectionHeader' }],
                [{
                  table: {
                    widths: ['25%', '75%'],
                    body: examenMedicoBody
                  },
                  layout: {
                    hLineWidth: function (i, node) { return 0.5; },
                    vLineWidth: function (i, node) { return 0.5; },
                    hLineColor: function (i, node) { return '#aaa'; },
                    vLineColor: function (i, node) { return '#aaa'; }
                  }
                }]
              ]
            },
            layout: 'headerLineOnly'
          });
        }
      }

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          },
          medicamentoHeader: {
            bold: true,
            fontSize: 11
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

exports.generarHistoriaClinicaPDF = async (req, res) => {
  try {
    const { historiaClinicaId } = req.params;

    // Obtener la historia clínica completa con referencias
    const historiaClinica = await HistoriaClinica.findById(historiaClinicaId)
      .populate('pacienteId', 'firstName lastName idType idNumber birthDate gender phone email ')
      .populate('doctorId', 'name lastName especialidad');

    if (!historiaClinica) {
      return res.status(404).json({
        success: false,
        message: 'Historia clínica no encontrada'
      });
    }

    // Preparar los datos para el PDF
    const paciente = historiaClinica.pacienteId;
    const doctor = historiaClinica.doctorId;

    // Crear un buffer para almacenar el PDF
    const pdfBuffer = await crearPDFHistoriaClinica(historiaClinica, paciente, doctor);

    // Subir el PDF a S3
    const nombreArchivo = `historia_clinica_${paciente.idNumber}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const rutaCarpeta = `patients/${paciente.idNumber}/historias-clinicas`;

    const pdfUrl = await uploadPDFFile(rutaCarpeta, nombreArchivo, pdfBuffer);

    if (!pdfUrl) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir el PDF a S3'
      });
    }

    // Actualizar la historia clínica con la URL del PDF
    historiaClinica.pdfUrl = pdfUrl;
    await historiaClinica.save();

    // Devolver la URL del PDF
    return res.status(200).json({
      success: true,
      message: 'PDF generado y almacenado correctamente',
      pdfUrl
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el PDF',
      error: error.message
    });
  }
};

// Función para crear el PDF de la fórmula médica
async function crearPDFFormulaMedica(formulaMedica, paciente, doctor, cita) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de fórmula médica...");

      // Asegurarse de que medicamentos sea un array
      if (!formulaMedica.medicamentos) {
        formulaMedica.medicamentos = [];
      } else if (!Array.isArray(formulaMedica.medicamentos)) {
        try {
          formulaMedica.medicamentos = JSON.parse(formulaMedica.medicamentos);
        } catch (e) {
          console.error("Error al parsear medicamentos:", e);
          formulaMedica.medicamentos = [];
        }
      }

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);

      const pacienteCita = await Cita.findById(formulaMedica.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      let content = [];

      // Añadir logos y datos de la institución en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });

      // Título principal
      content.push({ text: 'FÓRMULA MÉDICA', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA CONSULTA
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA CONSULTA', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Fecha de emisión', style: 'tableHeader' },
        { text: formatearFecha(formulaMedica.createdAt || new Date()) },
        { text: 'Fecha de cita', style: 'tableHeader' },
        { text: cita && cita.fecha ? formatearFecha(cita.fecha) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Hora de cita', style: 'tableHeader' },
        { text: cita && cita.hora ? cita.hora : 'No registrada' },
        { text: '', style: 'tableHeader' },
        { text: '' }
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}` },
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado' },
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado' },
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
        {},
        {}
      ]);

      // PROFESIONAL DE LA SALUD
      mainTableBody.push([{ text: 'PROFESIONAL DE LA SALUD', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada' }
      ]);

      // DIAGNÓSTICOS
      if (formulaMedica.diagnosticos && formulaMedica.diagnosticos.length > 0) {
        // Asegurarse de que diagnosticos sea un array
        let diagnosticos = formulaMedica.diagnosticos;
        if (!Array.isArray(diagnosticos)) {
          try {
            diagnosticos = JSON.parse(diagnosticos);
          } catch (e) {
            console.error("Error al parsear diagnósticos:", e);
            diagnosticos = [];
          }
        }

        if (diagnosticos.length > 0) {
          mainTableBody.push([{ text: 'DIAGNÓSTICOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);

          // Encabezados de la tabla de diagnósticos
          mainTableBody.push([
            { text: 'Código', style: 'tableHeader' },
            { text: 'Diagnóstico', style: 'tableHeader' },
            { text: 'Tipo', style: 'tableHeader' },
            { text: 'Relación', style: 'tableHeader' }
          ]);

          // Añadir cada diagnóstico
          diagnosticos.forEach(diagnostico => {
            mainTableBody.push([
              { text: diagnostico.codigo || 'No especificado' },
              { text: diagnostico.nombre || 'No especificado' },
              { text: diagnostico.tipo || 'No especificado' },
              { text: diagnostico.relacionado || 'No especificado' }
            ]);
          });
        }
      }

      // Luego continúa con la sección de MEDICAMENTOS PRESCRITOS
      mainTableBody.push([{ text: 'MEDICAMENTOS PRESCRITOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);

      // Añadir cada medicamento
      if (formulaMedica.medicamentos && formulaMedica.medicamentos.length > 0) {
        formulaMedica.medicamentos.forEach((medicamento, index) => {
          // Título del medicamento
          mainTableBody.push([
            { text: `Medicamento ${index + 1}:`, style: 'medicamentoHeader', colSpan: 4, margin: [0, 5, 0, 0] },
            {}, {}, {}
          ]);

          // Datos del medicamento
          if (medicamento.denominacionComun) {
            mainTableBody.push([
              { text: 'Denominación común', style: 'tableHeader' },
              { text: medicamento.denominacionComun || 'No especificado', colSpan: 3 },
              {}, {}
            ]);
          }

          if (medicamento.concentracion) {
            mainTableBody.push([
              { text: 'Concentración', style: 'tableHeader' },
              { text: medicamento.concentracion || 'No especificado' },
              { text: 'Unidad de medida', style: 'tableHeader' },
              { text: medicamento.unidadMedida || 'No especificado' }
            ]);
          }

          if (medicamento.formaFarmaceutica) {
            mainTableBody.push([
              { text: 'Forma farmacéutica', style: 'tableHeader' },
              { text: medicamento.formaFarmaceutica || 'No especificado', colSpan: 3 },
              {}, {}
            ]);
          }

          if (medicamento.dosis || medicamento.viaAdministracion || medicamento.frecuencia) {
            mainTableBody.push([
              { text: 'Dosis', style: 'tableHeader' },
              { text: medicamento.dosis || 'No especificado' },
              { text: 'Vía de administración', style: 'tableHeader' },
              { text: medicamento.viaAdministracion || 'No especificado' }
            ]);
          }

          if (medicamento.frecuencia || medicamento.diasTratamiento) {
            mainTableBody.push([
              { text: 'Frecuencia', style: 'tableHeader' },
              { text: medicamento.frecuencia || 'No especificado' },
              { text: 'Días de tratamiento', style: 'tableHeader' },
              { text: medicamento.diasTratamiento || 'No especificado' }
            ]);
          }

          if (medicamento.cantidadNumeros || medicamento.cantidadLetras) {
            mainTableBody.push([
              { text: 'Cantidad (números)', style: 'tableHeader' },
              { text: medicamento.cantidadNumeros || 'No especificado' },
              { text: 'Cantidad (letras)', style: 'tableHeader' },
              { text: medicamento.cantidadLetras || 'No especificado' }
            ]);
          }

          if (medicamento.indicaciones) {
            mainTableBody.push([
              { text: 'Indicaciones', style: 'tableHeader' },
              { text: medicamento.indicaciones || 'No especificado', colSpan: 3 },
              {}, {}
            ]);
          }

          // Espacio entre medicamentos
          if (index < formulaMedica.medicamentos.length - 1) {
            mainTableBody.push([
              { text: '', colSpan: 4, margin: [0, 5, 0, 0] },
              {}, {}, {}
            ]);
          }
        });
      } else {
        mainTableBody.push([
          { text: 'No hay medicamentos prescritos', italics: true, colSpan: 4, margin: [0, 5, 0, 5] },
          {}, {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es una fórmula médica oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          },
          medicamentoHeader: {
            bold: true,
            fontSize: 11
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

// Función para crear el PDF de incapacidad
async function crearPDFIncapacidad(incapacidad, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de incapacidad...");

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      const pacienteCita = await Cita.findById(incapacidad.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      let content = [];
      // Añadir logo en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
      // Título principal
      content.push({ text: 'CERTIFICADO DE INCAPACIDAD MÉDICA', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA INCAPACIDAD
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA INCAPACIDAD', style: 'sectionHeader', colSpan: 6 }, {}, {}, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Lugar de expedición', style: 'tableHeader' },
        { text: incapacidad.lugarExpedicion || 'No registrado' },
        { text: 'Fecha de expedición', style: 'tableHeader' },
        { text: formatearFecha(incapacidad.fechaExpedicion) },
        { text: 'Modalidad', style: 'tableHeader' },
        { text: incapacidad.modalidadPrestacionServicio || 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Fecha inicial', style: 'tableHeader' },
        { text: formatearFecha(incapacidad.fechaInicial) },
        { text: 'Días de incapacidad', style: 'tableHeader' },
        { text: incapacidad.dias || '0' },
        { text: 'Fecha final', style: 'tableHeader' },
        { text: formatearFecha(incapacidad.fechaFinal) }
      ]);
      mainTableBody.push([
        { text: '¿Es prórroga?', style: 'tableHeader' },
        { text: incapacidad.esProrroga ? 'Sí' : 'No', colSpan: 5 },
        {}, {}, {}, {}
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 6 }, {}, {}, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}`, colSpan: 2 },
        {},
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado', colSpan: 2 },
        {}
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado', colSpan: 2 },
        {},
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada', colSpan: 2 },
        {}
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado', colSpan: 2 },
        {},
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado', colSpan: 2 },
        {}
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 5 },
        {}, {}, {}, {}
      ]);

      // DIAGNÓSTICO
      mainTableBody.push([{ text: 'DIAGNÓSTICO', style: 'sectionHeader', colSpan: 6 }, {}, {}, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Diagnóstico principal', style: 'tableHeader' },
        { text: incapacidad.diagnosticoPrincipal || 'No registrado', colSpan: 5 },
        {}, {}, {}, {}
      ]);
      mainTableBody.push([
        { text: 'Causa de atención', style: 'tableHeader' },
        { text: incapacidad.causaAtencion || 'No registrada', colSpan: 5 },
        {}, {}, {}, {}
      ]);

      // PROFESIONAL DE LA SALUD
      mainTableBody.push([{ text: 'PROFESIONAL DE LA SALUD', style: 'sectionHeader', colSpan: 6 }, {}, {}, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}`, colSpan: 2 },
        {},
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada', colSpan: 2 },
        {}
      ]);

      if (doctor.cedula) {
        mainTableBody.push([
          { text: 'Cédula profesional', style: 'tableHeader' },
          { text: doctor.cedula, colSpan: 5 },
          {}, {}, {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['16%', '16%', '16%', '16%', '16%', '20%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es un certificado médico oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

async function crearPDFExamenLaboratorio(examenLaboratorio, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de examen de laboratorio...");

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      const pacienteCita = await Cita.findById(examenLaboratorio.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      let content = [];
      // Añadir logo en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
      // Título principal
      content.push({ text: 'ORDEN DE EXÁMENES DE LABORATORIO', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA ORDEN
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA ORDEN', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Fecha de emisión', style: 'tableHeader' },
        { text: formatearFecha(examenLaboratorio.createdAt || new Date()), colSpan: 3 },
        {}, {}
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}` },
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado' },
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado' },
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
        {},
        {}
      ]);

      // DIAGNÓSTICOS (si existen)
      if (examenLaboratorio.diagnosticos && examenLaboratorio.diagnosticos.length > 0) {
        mainTableBody.push([{ text: 'DIAGNÓSTICOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
        mainTableBody.push([
          { text: 'Código', style: 'tableHeader' },
          { text: 'Nombre', style: 'tableHeader' },
          { text: 'Tipo', style: 'tableHeader' },
          { text: 'Relacionado', style: 'tableHeader' }
        ]);

        examenLaboratorio.diagnosticos.forEach(diagnostico => {
          mainTableBody.push([
            { text: diagnostico.codigo || '' },
            { text: diagnostico.nombre || '' },
            { text: diagnostico.tipo || '' },
            { text: diagnostico.relacionado || '' }
          ]);
        });
      }

      // EXÁMENES SOLICITADOS
      mainTableBody.push([{ text: 'EXÁMENES SOLICITADOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Código', style: 'tableHeader' },
        { text: 'Descripción', style: 'tableHeader' },
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Observación', style: 'tableHeader' }
      ]);

      if (examenLaboratorio.examenes && examenLaboratorio.examenes.length > 0) {
        examenLaboratorio.examenes.forEach(examen => {
          mainTableBody.push([
            { text: examen.codigo || '' },
            { text: examen.descripcion || '' },
            { text: examen.cantidad || '' },
            { text: examen.observacion || '' }
          ]);
        });
      } else {
        mainTableBody.push([
          { text: 'No hay exámenes registrados', colSpan: 4, alignment: 'center' },
          {}, {}, {}
        ]);
      }

      // PROFESIONAL DE LA SALUD
      mainTableBody.push([{ text: 'PROFESIONAL DE LA SALUD', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada' }
      ]);

      if (doctor.cedula) {
        mainTableBody.push([
          { text: 'Cédula profesional', style: 'tableHeader' },
          { text: doctor.cedula, colSpan: 3 },
          {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es una orden médica oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

async function crearPDFAyudasDiagnosticas(ayudasDiagnosticas, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de ayudas diagnósticas...");

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      const pacienteCita = await Cita.findById(ayudasDiagnosticas.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      let content = [];
      // Añadir logo en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
      // Título principal
      content.push({ text: 'AYUDAS DIAGNÓSTICAS', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA ORDEN
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA ORDEN', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Fecha de emisión', style: 'tableHeader' },
        { text: formatearFecha(ayudasDiagnosticas.createdAt || new Date()), colSpan: 3 },
        {}, {}
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}` },
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado' },
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado' },
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
        {},
        {}
      ]);

      // DIAGNÓSTICOS (si existen)
      if (ayudasDiagnosticas.diagnosticos && ayudasDiagnosticas.diagnosticos.length > 0) {
        mainTableBody.push([{ text: 'DIAGNÓSTICOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
        mainTableBody.push([
          { text: 'Código', style: 'tableHeader' },
          { text: 'Nombre', style: 'tableHeader' },
          { text: 'Tipo', style: 'tableHeader' },
          { text: 'Relacionado', style: 'tableHeader' }
        ]);

        ayudasDiagnosticas.diagnosticos.forEach(diagnostico => {
          mainTableBody.push([
            { text: diagnostico.codigo || '' },
            { text: diagnostico.nombre || '' },
            { text: diagnostico.tipo || '' },
            { text: diagnostico.relacionado || '' }
          ]);
        });
      }

      // EXÁMENES SOLICITADOS
      mainTableBody.push([{ text: 'EXÁMENES SOLICITADOS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Código', style: 'tableHeader' },
        { text: 'Descripción', style: 'tableHeader' },
        { text: 'Cantidad', style: 'tableHeader' },
        { text: 'Observación', style: 'tableHeader' }
      ]);

      if (ayudasDiagnosticas.examenes && ayudasDiagnosticas.examenes.length > 0) {
        ayudasDiagnosticas.examenes.forEach(examen => {
          mainTableBody.push([
            { text: examen.codigo || '' },
            { text: examen.descripcion || '' },
            { text: examen.cantidad || '' },
            { text: examen.observacion || '' }
          ]);
        });
      } else {
        mainTableBody.push([
          { text: 'No hay exámenes registrados', colSpan: 4, alignment: 'center' },
          {}, {}, {}
        ]);
      }

      // PROFESIONAL DE LA SALUD
      mainTableBody.push([{ text: 'PROFESIONAL DE LA SALUD', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada' }
      ]);

      if (doctor.cedula) {
        mainTableBody.push([
          { text: 'Cédula profesional', style: 'tableHeader' },
          { text: doctor.cedula, colSpan: 3 },
          {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es una orden médica oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

async function crearPDFInterconsulta(interconsulta, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de interconsulta...");

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      const pacienteCita = await Cita.findById(interconsulta.citaId).populate('pacienteId');
      console.log(pacienteCita);

      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }

      // Contenido del documento
      let content = [];

      // Añadir logo en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
      // Título principal
      content.push({ text: 'SOLICITUD DE INTERCONSULTA', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA SOLICITUD
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA SOLICITUD', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Fecha de solicitud', style: 'tableHeader' },
        { text: formatearFecha(interconsulta.createdAt || new Date()), colSpan: 3 },
        {}, {}
      ]);
      mainTableBody.push([
        { text: 'Servicio solicitado', style: 'tableHeader' },
        { text: interconsulta.servicio || 'No especificado', colSpan: 3 },
        {}, {}
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}` },
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado' },
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado' },
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
        {},
        {}
      ]);

      // ESPECIALIDADES Y MOTIVOS DE CONSULTA
      mainTableBody.push([{ text: 'ESPECIALIDADES SOLICITADAS', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);

      // Verificar si hay especialidades
      if (interconsulta.especialidades && interconsulta.especialidades.length > 0) {
        // Encabezados de la tabla de especialidades
        mainTableBody.push([
          { text: 'Especialidad', style: 'tableHeader', colSpan: 2 },
          {},
          { text: 'Motivo de consulta', style: 'tableHeader', colSpan: 2 },
          {}
        ]);

        // Agregar cada especialidad y su motivo de consulta
        interconsulta.especialidades.forEach(item => {
          mainTableBody.push([
            { text: item.especialidad || 'No especificada', colSpan: 2 },
            {},
            { text: item.motivoConsulta || 'No especificado', colSpan: 2 },
            {}
          ]);
        });
      } else {
        // Si no hay especialidades, mostrar mensaje
        mainTableBody.push([
          { text: 'No se han especificado especialidades', colSpan: 4, alignment: 'center' },
          {}, {}, {}
        ]);
      }

      // MÉDICO SOLICITANTE
      mainTableBody.push([{ text: 'MÉDICO SOLICITANTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada' }
      ]);

      if (doctor.cedula) {
        mainTableBody.push([
          { text: 'Cédula profesional', style: 'tableHeader' },
          { text: doctor.cedula, colSpan: 3 },
          {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es una solicitud de interconsulta oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}

async function crearPDFApoyoTerapeutico(apoyoTerapeutico, paciente, doctor) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Iniciando generación de PDF de apoyo terapéutico...");

      // Descargar la firma del doctor si existe
      let firmaImageData = null;
      if (doctor && doctor.url_firma) {
        try {
          console.log("Intentando descargar firma desde:", doctor.url_firma);
          const response = await axios.get(doctor.url_firma, { responseType: 'arraybuffer' });
          firmaImageData = 'data:image/png;base64,' + Buffer.from(response.data).toString('base64');
          console.log("Firma descargada correctamente");
        } catch (error) {
          console.error('Error al descargar la firma:', error);
        }
      }

      // Definir fuentes estándar
      const fonts = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);
      const pacienteCita = await Cita.findById(apoyoTerapeutico.citaId).populate('pacienteId');
      console.log(pacienteCita);
      // Determinar qué logo y datos del hospital usar según el hospital del paciente
      let logoPath, hospitalName, hospitalWebsite, hospitalAddress, hospitalPhone, hospitalEmail;
      let logoSize = [50, 50]; // Tamaño predeterminado para los logos
      let logoSize2 = [110, 110]; // Tamaño predeterminado para los logos
      let logoWidth = 60; // Ancho de la columna del logo
      let logoMargin = [0, 3, 8, 0]; // Margen del logo [izquierda, arriba, derecha, abajo]

      if (pacienteCita && pacienteCita.pacienteId.hospital === 'Nimaima') {
        console.log("Usando datos del hospital de Nimaima");
        logoPath = path.join(__dirname, 'logonimai.png');
        hospitalName = 'E.S.E Centro de Salud San José de Nimaima';
        hospitalWebsite = 'www.hnimaima.gov.co';
        hospitalAddress = 'Cra 4 # 5-15 barrio chico bajo Nimaima';
        hospitalPhone = '(+57) 3134312956';
        hospitalEmail = 'esetelemedicina@gmail.com';
        logoSize = [110, 110]; // Tamaño más grande para el logo de Nimaima
        logoWidth = 120; // Ancho mayor para la columna del logo
        logoMargin = [30, 3, 15, 0]; // Más margen derecho para centrar mejor
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Ricaurte') {
        console.log("Usando datos del hospital de Ricaurte");
        logoPath = path.join(__dirname, 'logocsr.jpg');
        hospitalName = 'E.S.E Centro de Salud Ricaurte | Cundinamarca';
        hospitalWebsite = 'http://www.ese-ricaurte-cundinamarca.gov.co/';
        hospitalAddress = 'Calle 4 No 14 B-22/ El Pesebre, Ricaurte-Cundinamarca';
        hospitalPhone = '(+57) 3156952445';
        hospitalEmail = '';
      } else if (pacienteCita && pacienteCita.pacienteId.hospital === 'Junin') {
        console.log("Usando datos del hospital de Junín");
        logoPath = path.join(__dirname, 'logoJunin.jpg');
        hospitalName = 'Policlínico de Junín';
        hospitalWebsite = '';
        hospitalAddress = 'Cll 3 N 5-27';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [80, 80]; // Logo más pequeño para Junín
        logoWidth = 100; // Ancho menor para la columna del logo
        logoMargin = [0, -10, 10, 0]; // Márgenes ajustados para alinear correctamente
      } else if (pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares')) {
        console.log("Usando configuración para Florian/Olivares");
        logoPath = path.join(__dirname, 'logobosque.jpg');
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
        logoSize = [110, 110];
        logoWidth = 120;
        logoMargin = [30, 3, 15, 0];
      } else {
        // Valores por defecto en caso de que no se especifique un hospital o no coincida con los conocidos
        console.log("Hospital no reconocido, usando valores por defecto");
        logoPath = path.join(__dirname, 'logobosque.jpg'); // Logo por defecto
        hospitalName = '';
        hospitalWebsite = '';
        hospitalAddress = '';
        hospitalPhone = '';
        hospitalEmail = '';
      }
      // Contenido del documento
      let content = [];
      // Añadir logo en la parte superior
      content.push({
        columns: pacienteCita && (pacienteCita.pacienteId.hospital === 'Florian' || pacienteCita.pacienteId.hospital === 'Olivares') ? [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          }
        ] : [
          {
            width: logoWidth,
            image: logoPath,
            fit: logoSize,
            alignment: 'center',
            margin: logoMargin
          },
          {
            width: '*',
            stack: [
              { text: hospitalName, style: 'institutionName' },
              hospitalWebsite ? { text: `Sitio web: ${hospitalWebsite}`, style: 'institutionInfo' } : {},
              hospitalAddress ? { text: `Dirección: ${hospitalAddress}`, style: 'institutionInfo' } : {},
              hospitalPhone ? { text: `Teléfono Conmutador: ${hospitalPhone}`, style: 'institutionInfo' } : {},
              hospitalEmail ? { text: `Email: ${hospitalEmail}`, style: 'institutionInfo' } : {}
            ].filter(item => Object.keys(item).length > 0), // Filtrar elementos vacíos
            alignment: 'left',
            margin: [0, 3, 0, 0]
          },
          {
            width: logoWidth,
            image: path.join(__dirname, 'logobosque.jpg'),
            fit: logoSize2,
            alignment: 'center',
            margin: logoMargin
          }
        ],
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
      // Título principal
      content.push({ text: 'SOLICITUD DE APOYO TERAPÉUTICO', style: 'header', margin: [0, 0, 0, 10] });

      // Tabla principal que contiene todas las secciones
      let mainTableBody = [];

      // INFORMACIÓN DE LA SOLICITUD
      mainTableBody.push([{ text: 'INFORMACIÓN DE LA SOLICITUD', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Fecha de solicitud', style: 'tableHeader' },
        { text: formatearFecha(apoyoTerapeutico.createdAt || new Date()), colSpan: 3 },
        {}, {}
      ]);
      mainTableBody.push([
        { text: 'Servicio solicitado', style: 'tableHeader' },
        { text: apoyoTerapeutico.servicio || 'No especificado' },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: apoyoTerapeutico.especialidad || 'No especificada' }
      ]);

      // INFORMACIÓN DEL PACIENTE
      mainTableBody.push([{ text: 'INFORMACIÓN DEL PACIENTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre completo', style: 'tableHeader' },
        { text: `${paciente.firstName || ''} ${paciente.lastName || ''}` },
        { text: 'Tipo de identificación', style: 'tableHeader' },
        { text: paciente.idType || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'Número de identificación', style: 'tableHeader' },
        { text: paciente.idNumber || 'No registrado' },
        { text: 'Fecha de nacimiento', style: 'tableHeader' },
        { text: paciente.birthDate ? formatearFecha(paciente.birthDate) : 'No registrada' }
      ]);
      mainTableBody.push([
        { text: 'Teléfono', style: 'tableHeader' },
        { text: paciente.phone || 'No registrado' },
        { text: 'Email', style: 'tableHeader' },
        { text: paciente.email || 'No registrado' }
      ]);
      mainTableBody.push([
        { text: 'EPS', style: 'tableHeader' },
        { text: paciente.insuranceName || 'No registrada', colSpan: 3 },
        {},
        {}
      ]);

      // MOTIVO DE CONSULTA
      mainTableBody.push([{ text: 'MOTIVO DE CONSULTA', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        {
          text: apoyoTerapeutico.motivoConsulta || 'No especificado',
          colSpan: 4,
          margin: [0, 5, 0, 5]
        }, {}, {}, {}
      ]);

      // MÉDICO SOLICITANTE
      mainTableBody.push([{ text: 'MÉDICO SOLICITANTE', style: 'sectionHeader', colSpan: 4 }, {}, {}, {}]);
      mainTableBody.push([
        { text: 'Nombre', style: 'tableHeader' },
        { text: `${doctor.name || ''} ${doctor.lastName || ''}` },
        { text: 'Especialidad', style: 'tableHeader' },
        { text: doctor.especialidad || 'No registrada' }
      ]);

      if (doctor.cedula) {
        mainTableBody.push([
          { text: 'Cédula profesional', style: 'tableHeader' },
          { text: doctor.cedula, colSpan: 3 },
          {}, {}
        ]);
      }

      // Añadir la tabla principal al contenido
      content.push({
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: mainTableBody
        },
        layout: {
          hLineWidth: function (i, node) {
            return 0.5;
          },
          vLineWidth: function (i, node) {
            return 0.5;
          },
          hLineColor: function (i, node) {
            return '#aaa';
          },
          vLineColor: function (i, node) {
            return '#aaa';
          },
          paddingLeft: function (i, node) { return 4; },
          paddingRight: function (i, node) { return 4; },
          paddingTop: function (i, node) { return 2; },
          paddingBottom: function (i, node) { return 2; }
        }
      });

      // Añadir firma del médico
      content.push(
        { text: '', margin: [0, 20, 0, 0] },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: [
                firmaImageData ?
                  { image: firmaImageData, width: 150, alignment: 'center' } :
                  {
                    canvas: [
                      {
                        type: 'line',
                        x1: 0, y1: 0,
                        x2: 150, y2: 0,
                        lineWidth: 1
                      }
                    ]
                  },
                { text: `${doctor.name || ''} ${doctor.lastName || ''}`, alignment: 'center', bold: true },
                { text: doctor.especialidad || 'Médico', alignment: 'center' },
                // Agregar RM + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RM ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' },
                // Agregar RT + cédula solo si existe la cédula
                doctor.cedula ?
                  { text: `RT ${doctor.cedula}`, alignment: 'center', fontSize: 9 } :
                  { text: '', alignment: 'center' }
              ]
            },
            { width: '*', text: '' }
          ]
        },
        { text: '', margin: [0, 10, 0, 0] },
        { text: `Este documento es una solicitud de apoyo terapéutico oficial. Fecha de emisión: ${formatearFecha(new Date())}`, alignment: 'center', fontSize: 8 }
      );

      // Documento final
      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 16, // Reducido de 18
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 8]
          },
          institutionName: {
            fontSize: 10, // Reducido de 12
            bold: true,
            margin: [0, 0, 0, 2]
          },
          institutionInfo: {
            fontSize: 8, // Reducido de 10
            margin: [0, 0, 0, 1]
          },
          sectionHeader: {
            fontSize: 12,
            bold: true,
            fillColor: '#f2f2f2',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            padding: [5, 5, 5, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'black',
            fillColor: '#f2f2f2'
          }
        },
        defaultStyle: {
          fontSize: 10
        },
        footer: function (currentPage, pageCount) {
          return {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'center',
            fontSize: 8,
            margin: [40, 0, 40, 0]
          };
        }
      };

      console.log("Creando documento PDF...");
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const chunks = [];
      pdfDoc.on('data', chunk => {
        console.log(`Chunk recibido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF completado. Tamaño:", result.length, "bytes");
        resolve(result);
      });

      pdfDoc.on('error', err => {
        console.error("Error en PDF:", err);
        reject(err);
      });

      console.log("Finalizando documento...");
      pdfDoc.end();

    } catch (error) {
      console.error('Error general:', error);
      reject(error);
    }
  });
}
// Exportar las funciones
module.exports = { crearPDFHistoriaClinica, crearPDFFormulaMedica, crearPDFIncapacidad, crearPDFExamenLaboratorio, crearPDFAyudasDiagnosticas, crearPDFInterconsulta, crearPDFApoyoTerapeutico };