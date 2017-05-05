const chai = require('chai');
chai.use(require('chai-fuzzy'));
const expect = chai.expect;

const {Treegram} = require("../lib/index");

describe('@datagica/treegram', () => {

  describe('should run the example', () => {

    const data = [
      {
        label: 'vegetable',
        description: 'edible thing'
      }, {
        label: 'vegeta',
        description: 'character'
      }
    ];

    const db = new Treegram({
      debug: false,
      fields: 'label',
      spellings: (map, ngram) => {
        // plural to singular
        map.set(ngram.replace(/(es )/gi, 'e '), 0.80)
      },
      data: data
    });

    const input = 'Vegeta, eat your vegetables!';

    it('should find the example input', done => {

      db.find(input).then(entities => {
        //console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "Vegeta",
            "value": {
              "label": "vegeta",
              "description": "character"
            },
            "score": 1,
            "position": {
              "sentence": 0,
              "word": 0,
              "begin": 0,
              "end": 6
            }
          }, {
            "ngram": "vegetables",
            "value": {
              "label": "vegetable",
              "description": "edible thing"
            },
            "score": 0.8,
            "position": {
              "sentence": 0,
              "word": 4,
              "begin": 17,
              "end": 27
            }
          }
        ]);

        db.replaceEntities(input, entities, entity => {
          return `<a href="/resource/${entity.value.label}" class="${ (entity.score > 0.80)
            ? 'good'
            : 'normal'}">${
          entity.ngram}</a> <i>(${
          entity.value.description})</i>`
        }).then(html => {
          expect(html).to.be.like(`<a href="/resource/vegeta" class="good">Vegeta</a> ` + `<i>(character)</i>, eat your ` + `<a href="/resource/vegetable" class="normal">vegetables</a> ` + `<i>(edible thing)</i>!`);

          db.replace(input, entity => `<a href="/resource/${entity.value.label}">${entity.ngram}</a>`).then(html => {
            expect(html).to.be.like(`<a href="/resource/vegeta">Vegeta</a>, eat your <a href="/resource/vegetable">vegetables</a>!`);
            done();
          })
        })

      }).catch(err => done(err))
    })
  })

  describe('for non-latin characters', () => {

    const data = [
      {
        label: {
          zh: '浙江大学',
          en: 'Zhejiang University',
          fr: 'Université de Zhejiang',
          es: 'Universidad de Zhejiang',
          ru: 'Чжэцзянский университет'
        },
        aliases: [
          'Zheda',
          'ZJU',
          'Zhejiang University',
          'Che Kiang University',
          '浙江大学',
          '浙江大學',
          'Zhèjiāng Dàxué',
          'Universidad de Zhejiang',
          'Université de Zhejiang',
          'Zhejiang-Universität',
          'Чжэцзянский университет',
          '저장 대학'
        ]
      }, {
        label: {
          en: 'abd-al-quadir'
        },
        aliases: []
      }, {
        label: {
          en: 'marc-olivier'
        },
        aliases: []
      }, {
        label: {
          en: 'any utf-8'
        },
        aliases: []
      }, {
        label: {
          en: 'that\'s fine'
        },
        aliases: []
      }, {
        label: {
          en: 'test 1'
        },
        aliases: ['について述べる']
      }, {
        label: {
          en: 'test 2'
        },
        aliases: ['句点と読点']
      },
      {
        label: {
          en: "asthenia",
          fr: "asthénie"
        },
        aliases: [
          "asthenia",
          "asthénie"
        ]
      }
    ];


    const db = new Treegram({
      debug: true,
      fields: [
        'label', 'aliases'
      ],
      spellings: (map, ngram) => {},
      data: data
    });

    const input = 'Vegeta, eat your vegetables!';
    it('should match non-latin characters', done => {

      db.find('浙江大學').then(entities => {
        //console.log("entities: "+JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "浙江大學",
            "value": {
              "label": {
                "zh": "浙江大学",
                "en": "Zhejiang University",
                "fr": "Université de Zhejiang",
                "es": "Universidad de Zhejiang",
                "ru": "Чжэцзянский университет"
              },
              "aliases": [
                "Zheda",
                "ZJU",
                "Zhejiang University",
                "Che Kiang University",
                "浙江大学",
                "浙江大學",
                "Zhèjiāng Dàxué",
                "Universidad de Zhejiang",
                "Université de Zhejiang",
                "Zhejiang-Universität",
                "Чжэцзянский университет",
                "저장 대학"
              ]
            },
            "score": 1,
            "position": {
              "sentence": 0,
              "word": 0,
              "begin": 0,
              "end": 4
            }
          }
        ]);
        done();

      }).catch(err => done(err))
    })
    it('should not match other non-latin characters such as •', done => {

      db.find('•').then(entities => {
        // console.log("entities: "+JSON.stringify(entities));
        expect(entities).to.be.like([]);
        done();

      }).catch(err => don(err))
    })

    it('should match words with hyphen', done => {
      db.find('marc-olivier et abd-al-quadir').then(entities => {
        //console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "marc-olivier",
            "value": {
              "label": {
                "en": "marc-olivier"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 0,
              "word": 0,
              "begin": 0,
              "end": 12
            }
          }, {
            "ngram": "abd-al-quadir",
            "value": {
              "label": {
                "en": "abd-al-quadir"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 0,
              "word": 2,
              "begin": 16,
              "end": 29
            }
          }
        ]);
        done();
      }).catch(err => done(err))
    })


    it('should split complex sentences', done => {
      db.find('hi guys!! ' + // sentence 0
          'what\'s up? ' + // 1
          'got any utf-8.. ' + // 2
          '\'cause I don\'t. ' + // 3
          'but that\'s fine' // 4
      ).then(entities => {
        //console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "any utf-8",
            "value": {
              "label": {
                "en": "any utf-8"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 2,
              "word": 5,
              "begin": 25,
              "end": 34
            }
          }, {
            "ngram": "that's fine",
            "value": {
              "label": {
                "en": "that's fine"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 4,
              "word": 11,
              "begin": 57,
              "end": 68
            }
          }
        ]);
        done();
      }).catch(err => done(err))
    })


    it('should split a multi-line sentence', done => {
      db.find(`
        hi guys!! what's
        up? got any
        utf-8.. 'cause
        I don't. but
         that's fine!
        `).then(entities => {
        // console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "any         utf-8",
            "value": {
              "label": {
                "en": "any utf-8"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 2,
              "word": 22,
              "begin": 42,
              "end": 59
            }
          },
          {
            "ngram": "that's fine",
            "value": {
              "label": {
                "en": "that's fine"
              },
              "aliases": []
            },
            "score": 1,
            "position": {
              "sentence": 4,
              "word": 53,
              "begin": 99,
              "end": 110
            }
          }
        ]);
        done()
      }).catch(err => done(err))
    })


    it('should split basic japanese sentences', done => {
      db.find("では主にマル「。」について述べる。句点と読点（“、”）を合わせて句読点と呼ぶ。").then(entities => {
        //console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "について述べる",
            "value": {
              "label": {
                "en": "test 1"
              },
              "aliases": ["について述べる"]
            },
            "score": 1,
            "position": {
              "sentence": 1,
              "word": 2,
              "begin": 9,
              "end": 16
            }
          }, {
            "ngram": "句点と読点",
            "value": {
              "label": {
                "en": "test 2"
              },
              "aliases": ["句点と読点"]
            },
            "score": 1,
            "position": {
              "sentence": 2,
              "word": 3,
              "begin": 17,
              "end": 22
            }
          }
        ]);
        done()
      }).catch(err => done(err))
    })

    it('should support words and apostrophes', done => {
      db.find("En médecine générale, 50% des patients se plaignent d'asthénie.").then(entities => {
        // console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "d'asthénie",
            "value": {
              "label": {
                "en": "asthenia",
                "fr": "asthénie"
              },
              "aliases": [
                "asthenia",
                "asthénie"
              ]
            },
            "score": 0.8, // no 1, because of the "d'" prefix which account for 2/10 of the total "mass"
            "position": {
              "sentence": 0,
              "word": 9,
              "begin": 54,
              "end": 62
            }
          }
        ]);
        done()
      }).catch(err => done(err))
    })

    it('should support \'s', done => {
      db.find("my thesis is about studying asthenia's impacct of work life quality").then(entities => {
        // console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like([
          {
            "ngram": "asthenia's",
            "value": {
              "label": {
                "en": "asthenia",
                "fr": "asthénie"
              },
              "aliases": [
                "asthenia",
                "asthénie"
              ]
            },
            "score": 0.8, // no 1, because of the "d'" prefix which account for 2/10 of the total "mass"
            "position": {
              "sentence": 0,
              "word": 5,
              "begin": 28,
              "end": 36
            }
          }
        ]);
        done()
      }).catch(err => done(err))
    })


  })
})
