const chai = require('chai');
chai.use(require('chai-fuzzy'));
const expect = chai.expect;

const Treegram = require("../lib/treegram").Treegram;

describe('@datagica/treegram', () => {

  describe('should run the example', () => {

    const data = [{
      label: 'vegetable',
      description: 'edible thing'
    }, {
      label: 'vegeta',
      description: 'character'
    }];

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
        //console.log("entities: "+JSON.stringify(entities, null, 2));
        expect(entities).to.be.like(
          [
            {
              "ngram": "Vegeta",
              "value": {
                "label": "vegeta",
                "description": "character"
              },
              "score": 1,
              "position": {
                "begin": 0,
                "end": 6
              }
            },
            {
              "ngram": "vegetables",
              "value": {
                "label": "vegetable",
                "description": "edible thing"
              },
              "score": 0.8,
              "position": {
                "begin": 17,
                "end": 27
              }
            }
          ]
        );

        db.replaceEntities(input, entities, entity => {
          return `<a href="/resource/${entity.value.label}" class="${
    (entity.score > 0.80) ? 'good' : 'normal'
    }">${
    entity.ngram
    }</a> <i>(${
    entity.value.description
    })</i>`
        }).then(html => {
          expect(html).to.be.like(
            `<a href="/resource/vegeta" class="good">Vegeta</a> ` +
            `<i>(character)</i>, eat your ` +
            `<a href="/resource/vegetable" class="normal">vegetables</a> ` +
            `<i>(edible thing)</i>!`
          );

          db.replace(input, entity =>
            `<a href="/resource/${entity.value.label}">${entity.ngram}</a>`
          ).then(html => {
            expect(html).to.be.like(
              `<a href="/resource/vegeta">Vegeta</a>, eat your <a href="/resource/vegetable">vegetables</a>!`
            );
            done();
          })
        })

      }).catch(err => {
        console.error(err);
      })
    })
  })

  describe('for non-latin characters', () => {

    const data = [{
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
    }];

    const db = new Treegram({
      debug: true,
      fields: [
        'label',
        'aliases'
      ],
      spellings: (map, ngram) => {},
      data: data
    });

    const input = 'Vegeta, eat your vegetables!';
    it('should match non-latin characters', done => {

      db.find('浙江大學').then(entities => {
        // console.log("entities: "+JSON.stringify(entities, null, 2));
        expect(entities).to.be.like(
          [
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
                "begin": 0,
                "end": 4
              }
            }
          ]
        );
        done();

      }).catch(err => {
        console.error(err);
      })
    })
    it('should not match other non-latin characters such as •', done => {

      db.find('•').then(entities => {
        // console.log("entities: "+JSON.stringify(entities));
        expect(entities).to.be.like(
          []
        );
        done();

      }).catch(err => {
        console.error(err);
      })
    })

    it('should match words with hyphen', done => {
      db.find('marc-olivier et abd-al-quadir').then(entities => {
        // console.log("entities: " + JSON.stringify(entities, null, 2));
        expect(entities).to.be.like(
          [
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
                "begin": 0,
                "end": 12
              }
            },
            {
              "ngram": "abd-al-quadir",
              "value": {
                "label": {
                  "en": "abd-al-quadir"
                },
                "aliases": []
              },
              "score": 1,
              "position": {
                "begin": 16,
                "end": 29
              }
            }
          ]
        );
        done();

      }).catch(err => {
        console.error(err);
      })
    })
  })
})
