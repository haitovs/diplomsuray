import { useMemo } from 'react'

export type Lang = 'ru' | 'en' | 'tk'

type Translations = Record<string, Record<Lang, string>>

const translations: Translations = {
  // ===== APP =====
  'app.title': {
    ru: 'V2X Безопасность',
    en: 'V2X Security',
    tk: 'V2X Howpsuzlygy',
  },
  'app.subtitle': {
    ru: 'Лаборатория симуляции',
    en: 'Simulation Laboratory',
    tk: 'Simulyasiýa barlaghanasy',
  },
  'app.systemOnline': {
    ru: 'СИСТЕМА ОНЛАЙН',
    en: 'SYSTEM ONLINE',
    tk: 'ULGAM ONLAYN',
  },
  'app.noConnection': {
    ru: 'НЕТ ПОДКЛЮЧЕНИЯ',
    en: 'NO CONNECTION',
    tk: 'BIRIKME YOK',
  },
  'app.attack': {
    ru: 'АТАКА',
    en: 'ATTACK',
    tk: 'HUJUM',
  },

  // ===== CONTEXT HINT BAR =====
  'hint.pressStart': {
    ru: 'Нажмите <strong>Старт</strong> на левой панели, чтобы запустить симуляцию',
    en: 'Press <strong>Start</strong> on the left panel to launch the simulation',
    tk: '<strong>Başla</strong> düwmesine basyp simulyasiýany işlediň',
  },
  'hint.selectAttack': {
    ru: 'Симуляция запущена. Выберите <strong>кибер-атаку</strong> слева, чтобы увидеть работу системы защиты',
    en: 'Simulation running. Select a <strong>cyber attack</strong> on the left to see the defense system in action',
    tk: 'Simulyasiýa işleýär. Gorag ulgamyny görmek üçin çepden <strong>kiber hüjüm</strong> saýlaň',
  },
  'hint.sybilActive': {
    ru: 'АТАКА СИВИЛЛЫ — хакер создаёт фейковые машины в сети',
    en: 'SYBIL ATTACK — hacker creates fake vehicles in the network',
    tk: 'SIBIL HUJUMI — haker toruň içinde galp ulaglar döredýär',
  },
  'hint.replayActive': {
    ru: 'ПОВТОРНАЯ АТАКА — хакер перехватывает и повторяет старые сообщения',
    en: 'REPLAY ATTACK — hacker intercepts and replays old messages',
    tk: 'GAÝTADAN HÜJÜM — haker köne habarlary tutýar we gaýtalaýar',
  },
  'hint.bogusActive': {
    ru: 'ЛОЖНЫЕ ДАННЫЕ — хакер отправляет поддельную позицию',
    en: 'BOGUS DATA — hacker sends falsified position',
    tk: 'ÝALAN MAGLUMATLAR — haker galp ýerleşiş iberýär',
  },
  'hint.attackGeneric': {
    ru: 'АТАКА: {name}',
    en: 'ATTACK: {name}',
    tk: 'HÜJÜM: {name}',
  },
  'hint.attackLogLink': {
    ru: 'Журнал атак →',
    en: 'Attack Log →',
    tk: 'Hüjümler žurnaly →',
  },

  // ===== CONTROLS =====
  'controls.title': {
    ru: 'Управление',
    en: 'Controls',
    tk: 'Dolandyryş',
  },
  'controls.start': {
    ru: 'Старт',
    en: 'Start',
    tk: 'Başla',
  },
  'controls.pause': {
    ru: 'Пауза',
    en: 'Pause',
    tk: 'Sakla',
  },
  'controls.panelTitle': {
    ru: 'Панель управления',
    en: 'Control Panel',
    tk: 'Dolandyryş paneli',
  },
  'controls.vehicleList': {
    ru: 'Список транспорта',
    en: 'Vehicle List',
    tk: 'Ulag sanawy',
  },
  'controls.logTitle': {
    ru: 'Журнал атак и защиты',
    en: 'Attack & Defense Log',
    tk: 'Hüjüm we gorag žurnaly',
  },
  'controls.help': {
    ru: 'Помощь',
    en: 'Help',
    tk: 'Kömek',
  },

  // ===== SETTINGS =====
  'settings.title': {
    ru: 'Настройки',
    en: 'Settings',
    tk: 'Sazlamalar',
  },
  'settings.speed': {
    ru: 'Скорость',
    en: 'Speed',
    tk: 'Tizlik',
  },
  'settings.idsSensitivity': {
    ru: 'Чувствит. IDS',
    en: 'IDS Sensitivity',
    tk: 'IDS duýgurlygy',
  },
  'settings.idsSensitivityTooltip': {
    ru: 'IDS — Система обнаружения вторжений',
    en: 'IDS — Intrusion Detection System',
    tk: 'IDS — Aralaşmagy ýüze çykaryş ulgamy',
  },
  'settings.v2vRange': {
    ru: 'Дальность V2V',
    en: 'V2V Range',
    tk: 'V2V aralygy',
  },
  'settings.v2vRangeTooltip': {
    ru: 'V2V — дальность связи между автомобилями',
    en: 'V2V — vehicle-to-vehicle communication range',
    tk: 'V2V — ulagara aragatnaşyk aralygy',
  },

  // ===== PRESETS =====
  'presets.title': {
    ru: 'Сценарии',
    en: 'Scenarios',
    tk: 'Ssenariýler',
  },
  'presets.description': {
    ru: 'Готовые сценарии дорожного движения.',
    en: 'Ready-made traffic scenarios.',
    tk: 'Taýýar ýol hereketiniň ssenariýleri.',
  },

  // ===== ATTACKS =====
  'attacks.title': {
    ru: 'Кибер-атаки',
    en: 'Cyber Attacks',
    tk: 'Kiber hüjümler',
  },
  'attacks.description': {
    ru: 'Запустите атаку и наблюдайте за реакцией системы защиты.',
    en: 'Launch an attack and observe the defense system response.',
    tk: 'Hüjümi başladyň we gorag ulgamynyň jogabyna syn ediň.',
  },
  'attacks.sophisticationLabel': {
    ru: 'Уровень сложности атаки:',
    en: 'Attack sophistication level:',
    tk: 'Hüjümiň çylşyrymlylyk derejesi:',
  },
  'attacks.sybil': {
    ru: 'Атака Сивиллы',
    en: 'Sybil Attack',
    tk: 'Sibil hüjümi',
  },
  'attacks.sybilDesc': {
    ru: 'Создание фейковых машин',
    en: 'Creating fake vehicles',
    tk: 'Galp ulaglary döretmek',
  },
  'attacks.replay': {
    ru: 'Повторная атака',
    en: 'Replay Attack',
    tk: 'Gaýtadan hüjüm',
  },
  'attacks.replayDesc': {
    ru: 'Повтор старых сообщений',
    en: 'Replaying old messages',
    tk: 'Köne habarlary gaýtalamak',
  },
  'attacks.bogus': {
    ru: 'Ложные данные',
    en: 'Bogus Data',
    tk: 'Ýalan maglumatlar',
  },
  'attacks.bogusDesc': {
    ru: 'Подделка позиции',
    en: 'Position falsification',
    tk: 'Ýerleşişi galplaşdyrmak',
  },
  'attacks.stop': {
    ru: 'Остановить атаку',
    en: 'Stop Attack',
    tk: 'Hüjümi sakla',
  },
  'attacks.learnMore': {
    ru: 'Подробнее',
    en: 'Learn more',
    tk: 'Giňişleýin',
  },

  // ===== SOPHISTICATION =====
  'sophistication.low': {
    ru: 'НИЗКИЙ',
    en: 'LOW',
    tk: 'PES',
  },
  'sophistication.medium': {
    ru: 'СРЕДНИЙ',
    en: 'MEDIUM',
    tk: 'ORTA',
  },
  'sophistication.high': {
    ru: 'ВЫСОКИЙ',
    en: 'HIGH',
    tk: 'YOKARY',
  },

  // ===== DEFENSE =====
  'defense.low': {
    ru: 'Низкий',
    en: 'Low',
    tk: 'Pes',
  },
  'defense.medium': {
    ru: 'Средний',
    en: 'Medium',
    tk: 'Orta',
  },
  'defense.high': {
    ru: 'Высокий',
    en: 'High',
    tk: 'Ýokary',
  },

  // ===== STATUS =====
  'status.moving': {
    ru: 'в движении',
    en: 'moving',
    tk: 'hereket edýär',
  },
  'status.stopped': {
    ru: 'остановлен',
    en: 'stopped',
    tk: 'saklandy',
  },
  'status.arrived': {
    ru: 'прибыл',
    en: 'arrived',
    tk: 'geldi',
  },
  'status.waiting': {
    ru: 'ожидание',
    en: 'waiting',
    tk: 'garaşýar',
  },

  // ===== STATS =====
  'stats.title': {
    ru: 'Статистика',
    en: 'Statistics',
    tk: 'Statistika',
  },
  'stats.vehicles': {
    ru: 'Машины',
    en: 'Vehicles',
    tk: 'Ulaglar',
  },
  'stats.step': {
    ru: 'Шаг',
    en: 'Step',
    tk: 'Ädim',
  },
  'stats.v2v': {
    ru: 'V2V',
    en: 'V2V',
    tk: 'V2V',
  },

  // ===== VEHICLE DETAILS =====
  'vehicle.type': {
    ru: 'Тип:',
    en: 'Type:',
    tk: 'Görnüşi:',
  },
  'vehicle.status': {
    ru: 'Статус:',
    en: 'Status:',
    tk: 'Ýagdaýy:',
  },
  'vehicle.speed': {
    ru: 'Скорость:',
    en: 'Speed:',
    tk: 'Tizligi:',
  },
  'vehicle.trust': {
    ru: 'Доверие:',
    en: 'Trust:',
    tk: 'Ynam:',
  },
  'vehicle.defense': {
    ru: 'Защита:',
    en: 'Defense:',
    tk: 'Goragyy:',
  },
  'vehicle.anomalies': {
    ru: 'Аномалии:',
    en: 'Anomalies:',
    tk: 'Anomaliýalar:',
  },
  'vehicle.speedAdjust': {
    ru: 'Регулировка скорости:',
    en: 'Speed adjustment:',
    tk: 'Tizligi sazlamak:',
  },
  'vehicle.activeVehicles': {
    ru: 'Активные транспортные средства',
    en: 'Active Vehicles',
    tk: 'Işjeň ulag serişdeleri',
  },
  'vehicle.kmh': {
    ru: 'км/ч',
    en: 'km/h',
    tk: 'km/sag',
  },

  // ===== VEHICLE TYPES =====
  'vtype.passenger': {
    ru: 'Авто',
    en: 'Car',
    tk: 'Awto',
  },
  'vtype.truck': {
    ru: 'Грузовик',
    en: 'Truck',
    tk: 'Ýük ulagy',
  },
  'vtype.bus': {
    ru: 'Автобус',
    en: 'Bus',
    tk: 'Awtobus',
  },
  'vtype.emergency': {
    ru: 'Экстренная',
    en: 'Emergency',
    tk: 'Tiz kömek',
  },
  'vtype.hacker': {
    ru: 'ХАКЕР',
    en: 'HACKER',
    tk: 'HAKER',
  },

  // ===== LEGEND =====
  'legend.title': {
    ru: 'Обозначения',
    en: 'Legend',
    tk: 'Bellikler',
  },
  'legend.passenger': {
    ru: 'Легковой',
    en: 'Passenger',
    tk: 'Ýeňil ulag',
  },
  'legend.truck': {
    ru: 'Грузовик',
    en: 'Truck',
    tk: 'Ýük ulagy',
  },
  'legend.bus': {
    ru: 'Автобус',
    en: 'Bus',
    tk: 'Awtobus',
  },
  'legend.emergency': {
    ru: 'Экстренная',
    en: 'Emergency',
    tk: 'Tiz kömek',
  },
  'legend.hacker': {
    ru: 'Хакер',
    en: 'Hacker',
    tk: 'Haker',
  },
  'legend.defenseLow': {
    ru: 'НИЗ',
    en: 'LOW',
    tk: 'PES',
  },
  'legend.defenseMid': {
    ru: 'СРЕ',
    en: 'MED',
    tk: 'ORT',
  },
  'legend.defenseHigh': {
    ru: 'ВЫС',
    en: 'HI',
    tk: 'ÝOK',
  },
  'legend.defenseLabel': {
    ru: '— защита',
    en: '— defense',
    tk: '— gorag',
  },
  'legend.roadNetwork': {
    ru: 'Дорожная сеть',
    en: 'Road Network',
    tk: 'Ýol tory',
  },
  'legend.commRange': {
    ru: 'Зона V2V связи',
    en: 'V2V Comm Range',
    tk: 'V2V aragatnaşyk zolagy',
  },
  'legend.attackBeam': {
    ru: 'Луч атаки',
    en: 'Attack Beam',
    tk: 'Hüjüm şöhlesi',
  },

  // ===== ALERTS =====
  'alerts.title': {
    ru: 'Оповещения IDS',
    en: 'IDS Alerts',
    tk: 'IDS duýduryşlary',
  },
  'alerts.systemSafe': {
    ru: 'Система в безопасности',
    en: 'System is safe',
    tk: 'Ulgam howpsuz',
  },

  // ===== LOG PANEL =====
  'log.title': {
    ru: 'Журнал атак и защиты',
    en: 'Attack & Defense Log',
    tk: 'Hüjüm we gorag žurnaly',
  },
  'log.monitoring': {
    ru: 'Мониторинг безопасности в реальном времени',
    en: 'Real-time security monitoring',
    tk: 'Hakyky wagt howpsuzlyk gözegçiligi',
  },
  'log.attacks': {
    ru: 'Атаки',
    en: 'Attacks',
    tk: 'Hüjümler',
  },
  'log.defenses': {
    ru: 'Защита',
    en: 'Defense',
    tk: 'Gorag',
  },
  'log.outcomes': {
    ru: 'Результаты',
    en: 'Results',
    tk: 'Netijeler',
  },
  'log.bypass': {
    ru: 'Обход:',
    en: 'Bypass:',
    tk: 'Aýlanyp geçme:',
  },
  'log.blocked': {
    ru: 'ЗАБЛОКИРОВАНО',
    en: 'BLOCKED',
    tk: 'BLOKLANAN',
  },
  'log.succeeded': {
    ru: 'ПРОШЛО',
    en: 'SUCCEEDED',
    tk: 'GEÇDI',
  },
  'log.active': {
    ru: 'АКТИВНО',
    en: 'ACTIVE',
    tk: 'IŞJEŇ',
  },
  'log.moreDetails': {
    ru: 'Подробнее',
    en: 'More details',
    tk: 'Giňişleýin',
  },
  'log.noAttacks': {
    ru: 'Атаки не обнаружены',
    en: 'No attacks detected',
    tk: 'Hüjüm ýüze çykarylmady',
  },
  'log.launchAttack': {
    ru: 'Запустите атаку на левой панели',
    en: 'Launch an attack from the left panel',
    tk: 'Çep panelden hüjüm başladyň',
  },
  'log.success': {
    ru: 'УСПЕХ',
    en: 'SUCCESS',
    tk: 'ÜSTÜNLIK',
  },
  'log.failure': {
    ru: 'ПРОВАЛ',
    en: 'FAILURE',
    tk: 'ŞOWSUZLYK',
  },
  'log.confidence': {
    ru: 'Уверенность:',
    en: 'Confidence:',
    tk: 'Ynam:',
  },
  'log.time': {
    ru: 'Время:',
    en: 'Time:',
    tk: 'Wagt:',
  },
  'log.howItWorks': {
    ru: 'Как это работает',
    en: 'How it works',
    tk: 'Nähili işleýär',
  },
  'log.noDefenses': {
    ru: 'Защита не активирована',
    en: 'Defense not activated',
    tk: 'Gorag işjeňleşdirilmedi',
  },
  'log.attackBlocked': {
    ru: 'Атака заблокирована',
    en: 'Attack blocked',
    tk: 'Hüjüm bloklanan',
  },
  'log.attackPassed': {
    ru: 'Атака прошла',
    en: 'Attack succeeded',
    tk: 'Hüjüm geçdi',
  },
  'log.defensesCount': {
    ru: 'защит',
    en: 'defenses',
    tk: 'gorag',
  },
  'log.conclusion': {
    ru: 'Вывод:',
    en: 'Conclusion:',
    tk: 'Netije:',
  },
  'log.noOutcomes': {
    ru: 'Результатов пока нет',
    en: 'No results yet',
    tk: 'Netije entek ýok',
  },

  // ===== LOG FOOTER STATS =====
  'logStats.active': {
    ru: 'Активные',
    en: 'Active',
    tk: 'Işjeň',
  },
  'logStats.blocked': {
    ru: 'Заблокир.',
    en: 'Blocked',
    tk: 'Bloklanan',
  },
  'logStats.successful': {
    ru: 'Успешно',
    en: 'Successful',
    tk: 'Üstünlikli',
  },

  // ===== WELCOME SCREEN =====
  'welcome.title': {
    ru: 'Симулятор безопасности V2X',
    en: 'V2X Security Simulator',
    tk: 'V2X Howpsuzlyk simulýatory',
  },
  'welcome.subtitle': {
    ru: 'Vehicle-to-Everything Security Simulation',
    en: 'Vehicle-to-Everything Security Simulation',
    tk: 'Vehicle-to-Everything Howpsuzlyk simulýasiýasy',
  },
  'welcome.whatIsV2x': {
    ru: 'Что такое V2X?',
    en: 'What is V2X?',
    tk: 'V2X näme?',
  },
  'welcome.v2xExplanation': {
    ru: '<strong>V2X (Vehicle-to-Everything)</strong> — это технология, позволяющая автомобилям обмениваться данными друг с другом и с инфраструктурой (светофоры, дорожные знаки). Это помогает избежать аварий и оптимизировать движение. Но эта связь может быть атакована злоумышленниками.',
    en: '<strong>V2X (Vehicle-to-Everything)</strong> is a technology that allows vehicles to exchange data with each other and with infrastructure (traffic lights, road signs). This helps avoid accidents and optimize traffic. But this connection can be attacked by malicious actors.',
    tk: '<strong>V2X (Vehicle-to-Everything)</strong> — ulaglara biri-biri bilen we infrastruktura (çyralar, ýol belgileri) bilen maglumat alyşmaga mümkinçilik berýän tehnologiýa. Bu heläkçilikleriň öňüni almaga we hereketi optimizirlemäge kömek edýär. Emma bu aragatnaşyga zyýanly kişiler hüjüm edip biler.',
  },
  'welcome.howToUse': {
    ru: 'Как пользоваться:',
    en: 'How to use:',
    tk: 'Nähili ulanmaly:',
  },
  'welcome.step1Title': {
    ru: 'Запустите симуляцию',
    en: 'Launch the simulation',
    tk: 'Simulýasiýany başladyň',
  },
  'welcome.step1Desc': {
    ru: 'Нажмите кнопку «Старт» на левой панели управления',
    en: 'Press the "Start" button on the left control panel',
    tk: 'Çep dolandyryş panelinde «Başla» düwmesine basyň',
  },
  'welcome.step2Title': {
    ru: 'Запустите кибер-атаку',
    en: 'Launch a cyber attack',
    tk: 'Kiber hüjüm başladyň',
  },
  'welcome.step2Desc': {
    ru: 'Выберите тип атаки в разделе «Кибер-атаки»',
    en: 'Select an attack type in the "Cyber Attacks" section',
    tk: '«Kiber hüjümler» bölüminde hüjüm görnüşini saýlaň',
  },
  'welcome.step3Title': {
    ru: 'Наблюдайте за защитой',
    en: 'Observe the defense',
    tk: 'Goraga syn ediň',
  },
  'welcome.step3Desc': {
    ru: 'Смотрите, как система IDS выявляет и блокирует атаки в правой панели',
    en: 'Watch how the IDS system detects and blocks attacks in the right panel',
    tk: 'Sag panelde IDS ulgamynyň hüjümleri ýüze çykaryşyna we bloklaýşyna syn ediň',
  },
  'welcome.legendPassenger': {
    ru: 'Легковые авто',
    en: 'Passenger cars',
    tk: 'Ýeňil awtoulaglar',
  },
  'welcome.legendTruck': {
    ru: 'Грузовики',
    en: 'Trucks',
    tk: 'Ýük ulaglary',
  },
  'welcome.legendHacker': {
    ru: 'Хакер',
    en: 'Hacker',
    tk: 'Haker',
  },
  'welcome.legendLight': {
    ru: 'Светофор',
    en: 'Traffic light',
    tk: 'Çyra',
  },
  'welcome.startButton': {
    ru: 'Начать работу с симулятором',
    en: 'Start the Simulator',
    tk: 'Simulýatory başlamak',
  },

  // ===== HELP MODAL =====
  'help.title': {
    ru: 'Справка по симулятору',
    en: 'Simulator Help',
    tk: 'Simulýator boýunça kömek',
  },
  'help.whatOnMap': {
    ru: 'Что происходит на карте?',
    en: 'What is happening on the map?',
    tk: 'Kartada näme bolýar?',
  },
  'help.mapExplanation': {
    ru: 'Симуляция показывает автомобили, которые обмениваются данными через технологию <strong>V2X</strong> (Vehicle-to-Everything). Машины передают друг другу информацию о скорости, местоположении и дорожной обстановке.',
    en: 'The simulation shows vehicles exchanging data via <strong>V2X</strong> (Vehicle-to-Everything) technology. Cars share information about speed, location, and road conditions with each other.',
    tk: 'Simulýasiýa <strong>V2X</strong> (Vehicle-to-Everything) tehnologiýasy arkaly maglumat alyşýan ulaglary görkezýär. Awtoulaglar biri-birine tizlik, ýerleşiş we ýol ýagdaýy barada maglumat iberýärler.',
  },
  'help.legendPassenger': {
    ru: 'Легковые авто',
    en: 'Passenger cars',
    tk: 'Ýeňil awtoulaglar',
  },
  'help.legendTruck': {
    ru: 'Грузовики',
    en: 'Trucks',
    tk: 'Ýük ulaglary',
  },
  'help.legendHacker': {
    ru: 'Хакер (атакующий)',
    en: 'Hacker (attacker)',
    tk: 'Haker (hüjümçi)',
  },
  'help.legendLight': {
    ru: 'Светофор',
    en: 'Traffic light',
    tk: 'Çyra',
  },
  'help.attackTypes': {
    ru: 'Типы кибер-атак',
    en: 'Cyber Attack Types',
    tk: 'Kiber hüjüm görnüşleri',
  },
  'help.sybilTitle': {
    ru: 'Атака Сивиллы (Sybil Attack)',
    en: 'Sybil Attack',
    tk: 'Sibil hüjümi (Sybil Attack)',
  },
  'help.sybilDesc': {
    ru: 'Атакующий создаёт множество фейковых машин в сети.',
    en: 'The attacker creates many fake vehicles in the network.',
    tk: 'Hüjümçi torda köp sanly galp ulag döredýär.',
  },
  'help.sybilAnalogy': {
    ru: 'Аналогия: как создание сотен фейковых аккаунтов в соцсетях.',
    en: 'Analogy: like creating hundreds of fake social media accounts.',
    tk: 'Meňzeşlik: sosial ulgamlarda ýüzlerçe galp hasap döretmek ýaly.',
  },
  'help.replayTitle': {
    ru: 'Повторная атака (Replay Attack)',
    en: 'Replay Attack',
    tk: 'Gaýtadan hüjüm (Replay Attack)',
  },
  'help.replayDesc': {
    ru: 'Перехват и повторная отправка ранее записанных сообщений.',
    en: 'Interception and re-sending of previously recorded messages.',
    tk: 'Ozal ýazylan habarlary tutmak we gaýtadan ibermek.',
  },
  'help.replayAnalogy': {
    ru: 'Аналогия: как повторное использование старого чека для скидки.',
    en: 'Analogy: like reusing an old receipt for a discount.',
    tk: 'Meňzeşlik: köne çegi arzanladyş üçin gaýtadan ulanmak ýaly.',
  },
  'help.bogusTitle': {
    ru: 'Ложные данные (Bogus Information)',
    en: 'Bogus Information',
    tk: 'Ýalan maglumatlar (Bogus Information)',
  },
  'help.bogusDesc': {
    ru: 'Отправка ложных данных о скорости или положении автомобиля.',
    en: 'Sending false data about vehicle speed or position.',
    tk: 'Ulagyň tizligi ýa ýerleşişi barada ýalan maglumatlary ibermek.',
  },
  'help.bogusAnalogy': {
    ru: 'Аналогия: как распространение фейковых новостей.',
    en: 'Analogy: like spreading fake news.',
    tk: 'Meňzeşlik: galp habarlary ýaýratmak ýaly.',
  },
  'help.idsTitle': {
    ru: 'Система защиты (IDS)',
    en: 'Defense System (IDS)',
    tk: 'Gorag ulgamy (IDS)',
  },
  'help.idsExplanation': {
    ru: '<strong>IDS</strong> (Intrusion Detection System) — автоматически анализирует сообщения в сети V2X и выявляет подозрительную активность.',
    en: '<strong>IDS</strong> (Intrusion Detection System) — automatically analyzes messages in the V2X network and detects suspicious activity.',
    tk: '<strong>IDS</strong> (Intrusion Detection System) — V2X torundaky habarlary awtomatiki derňeýär we şübheli hereketleri ýüze çykarýar.',
  },
  'help.controlsTitle': {
    ru: 'Управление',
    en: 'Controls',
    tk: 'Dolandyryş',
  },
  'help.controlsLeft': {
    ru: 'Левая панель — управление симуляцией и атаками',
    en: 'Left panel — simulation and attack controls',
    tk: 'Çep panel — simulýasiýa we hüjüm dolandyryşy',
  },
  'help.controlsRight': {
    ru: 'Правая панель — журнал атак и защиты',
    en: 'Right panel — attack and defense log',
    tk: 'Sag panel — hüjüm we gorag žurnaly',
  },
  'help.controlsBottom': {
    ru: 'Нижняя панель — список транспортных средств',
    en: 'Bottom panel — vehicle list',
    tk: 'Aşaky panel — ulag sanawy',
  },
  'help.controlsMap': {
    ru: 'Кнопки-переключатели в углах карты',
    en: 'Toggle buttons in map corners',
    tk: 'Kartanyň burçlaryndaky düwmeler',
  },
  'help.gotIt': {
    ru: 'Понятно!',
    en: 'Got it!',
    tk: 'Düşnükli!',
  },

  // ===== NARRATOR (enhanced 12+ states) =====
  'narrator.pressStart': {
    ru: 'Нажмите Старт, чтобы начать симуляцию',
    en: 'Press Start to begin the simulation',
    tk: 'Simulýasiýany başlamak üçin Başla basyň',
  },
  'narrator.allSafe': {
    ru: '{count} автомобилей обмениваются V2X-сообщениями. Всё безопасно.',
    en: '{count} vehicles are exchanging V2X messages. Everything is safe.',
    tk: '{count} ulag V2X habarlaryny alyşýar. Hemme zat howpsuz.',
  },
  'narrator.searchingTarget': {
    ru: 'Хакер ищет цель для {attack}...',
    en: 'Hacker is searching for a target for {attack}...',
    tk: 'Haker {attack} üçin nyşana gözleýär...',
  },
  'narrator.hackingInProgress': {
    ru: 'Хакер атакует {target} (защита: {defense}). Прогресс: {progress}%',
    en: 'Hacker is attacking {target} (defense: {defense}). Progress: {progress}%',
    tk: 'Haker {target}-a hüjüm edýär (gorag: {defense}). Öňegidişlik: {progress}%',
  },
  'narrator.hackSucceeded': {
    ru: '{target} взломан! Автомобиль остановлен.',
    en: '{target} has been hacked! Vehicle stopped.',
    tk: '{target} haklanan! Ulag saklandy.',
  },
  'narrator.defenseBlocked': {
    ru: 'Защита отразила атаку на {target}!',
    en: 'Defense blocked the attack on {target}!',
    tk: 'Gorag {target}-a bolan hüjümi bloklady!',
  },
  'narrator.watchGhosts': {
    ru: 'Следите за картой — вокруг хакера появятся призрачные машины (полупрозрачные иконки)',
    en: 'Watch the map — ghost vehicles will appear around the attacker (semi-transparent icons)',
    tk: 'Kartany synlaň — hakeriň daşynda arwah ulaglar peýda bolar (ýarym aýdyň nyşanlar)',
  },
  'narrator.watchBeam': {
    ru: 'Красная линия между атакующим и целью — это канал эксплойта',
    en: 'The red beam connecting attacker to target represents the exploit channel',
    tk: 'Hüjümçi bilen nyşanany birleşdirýän gyzyl şöhle ekspluatasiýa kanalyny görkezýär',
  },
  'narrator.watchProgress': {
    ru: 'Кольцо прогресса вокруг хакера показывает завершённость взлома — высокая защита = медленнее',
    en: 'The progress ring around the attacker shows hack completion — higher defense = slower progress',
    tk: 'Hakeriň daşyndaky öňegidişlik halkasy haklamagyň tamamlanmagyny görkezýär — ýokary gorag = haýal',
  },
  'narrator.defenseFlash': {
    ru: 'Зелёная вспышка на {target} — IDS обнаружила атаку!',
    en: 'Green flash on {target} — its IDS just detected the attack!',
    tk: '{target}-da ýaşyl ýalpyldawuk — IDS hüjümi ýüze çykardy!',
  },
  'narrator.sybilHint': {
    ru: 'Атака Сивиллы создаёт фейковые машины. Проверьте карту — призрачные иконки рядом с хакером',
    en: 'Sybil attack creates fake vehicles. Check the map — ghost icons near the attacker',
    tk: 'Sibil hüjümi galp ulaglary döredýär. Kartany barlaň — hakeriň ýanynda arwah nyşanlar',
  },
  'narrator.replayHint': {
    ru: 'Повторная атака переигрывает старые BSM-сообщения. Метки времени — ключ к обнаружению',
    en: 'Replay attack re-sends old BSM messages. Timestamps are the key to detection',
    tk: 'Gaýtadan hüjüm köne BSM habarlaryny iberýär. Wagt belgileri ýüze çykarmagyň açary',
  },
  'narrator.bogusHint': {
    ru: 'Ложная позиция — хакер отправляет неправильные GPS-координаты в BSM-пакетах',
    en: 'Bogus position — hacker sends wrong GPS coordinates in BSM packets',
    tk: 'Ýalan ýerleşiş — haker BSM paketlerinde nädogry GPS koordinatlaryny iberýär',
  },

  // ===== MAP =====
  'map.waitingData': {
    ru: 'Ожидание данных симуляции...',
    en: 'Waiting for simulation data...',
    tk: 'Simulýasiýa maglumatlary garaşylýar...',
  },
  'map.attackActive': {
    ru: 'АТАКА АКТИВНА: {name}',
    en: 'ATTACK ACTIVE: {name}',
    tk: 'HÜJÜM IŞJEŇ: {name}',
  },
  'map.hack': {
    ru: 'АТАКА',
    en: 'ATTACK',
    tk: 'HÜJÜM',
  },
  'map.breach': {
    ru: 'ВЗЛОМ',
    en: 'BREACH',
    tk: 'DÖWME',
  },
  'map.stoppedBadge': {
    ru: 'ОСТАНОВЛЕН',
    en: 'STOPPED',
    tk: 'SAKLANDY',
  },
  'map.inMotion': {
    ru: 'В движении',
    en: 'In motion',
    tk: 'Hereket edýär',
  },
  'map.stoppedLabel': {
    ru: 'Остановлен',
    en: 'Stopped',
    tk: 'Saklandy',
  },
  'map.speed': {
    ru: 'Скорость:',
    en: 'Speed:',
    tk: 'Tizligi:',
  },
  'map.defense': {
    ru: 'Защита:',
    en: 'Defense:',
    tk: 'Goragyy:',
  },
  'map.hackProgress': {
    ru: 'Взлом:',
    en: 'Hack:',
    tk: 'Döwme:',
  },
  'map.targetProgress': {
    ru: 'Цель атаки:',
    en: 'Attack target:',
    tk: 'Hüjüm nyşany:',
  },

  // ===== MAP LABELS =====
  'mapLabels.hacking': {
    ru: 'ВЗЛОМ...',
    en: 'HACKING...',
    tk: 'HAKLAÝAR...',
  },
  'mapLabels.blocked': {
    ru: 'БЛОКИРОВАНО!',
    en: 'BLOCKED!',
    tk: 'BLOKLANAN!',
  },
  'mapLabels.fake': {
    ru: 'ПОДДЕЛКА',
    en: 'FAKE',
    tk: 'GALP',
  },

  // ===== ATTACK INFO (educational deep content) =====
  // -- Sybil Attack --
  'attackInfo.sybil.whatIsIt': {
    ru: 'Атака Сивиллы создаёт множество фейковых идентификаторов транспортных средств в сети V2X. Названа по книге «Сивилла» (1973) о женщине с множественными личностями. Атакующий подделывает сертификаты и рассылает фейковые BSM-сообщения (Basic Safety Messages) от несуществующих машин.',
    en: 'A Sybil attack creates multiple fake vehicle identities in the V2X network. Named after the book "Sybil" (1973) about a woman with multiple personalities. The attacker forges certificates and broadcasts fake BSMs (Basic Safety Messages) from phantom vehicles that don\'t physically exist.',
    tk: 'Sibil hüjümi V2X torunda birnäçe galp ulag şahsyýetlerini döredýär. 1973-nji ýylyň "Sibil" kitabyndan alnandyr — köp şahsyýetli zenan hakynda. Hüjümçi şahadatnamalary galplaşdyrýar we fiziki taýdan ýok bolan arwah ulaglardan galp BSM habarlaryny iberýär.',
  },
  'attackInfo.sybil.howItWorks': {
    ru: '1) Хакер компрометирует один OBU (бортовой модуль). 2) Генерирует множество фейковых PKI-сертификатов. 3) Каждая фейковая личность рассылает BSM с подделанными координатами и скоростью. 4) Соседние автомобили получают противоречивые данные, что снижает доверие ко всей сети.',
    en: '1) Attacker compromises one OBU (On-Board Unit). 2) Generates multiple fake PKI certificates. 3) Each fake identity broadcasts BSMs with fabricated position/speed. 4) Nearby vehicles receive conflicting data, degrading trust in the entire network.',
    tk: '1) Hüjümçi bir OBU-ny (bort moduly) bozýar. 2) Köp sanly galp PKI şahadatnamalaryny döredýär. 3) Her galp şahsyýet galp koordinata/tizlik bilen BSM iberýär. 4) Golaýdaky ulaglar gapma-garşy maglumatlary alýar we tutuş tora bolan ynam azalýar.',
  },
  'attackInfo.sybil.realWorldUsage': {
    ru: 'Продемонстрирована на DEF CON 2019 на системах DSRC V2X. Также часто встречается в блокчейне (атаки 51%), P2P-сетях (BitTorrent) и соцсетях (бот-фермы). IEEE 802.11p V2X особенно уязвим из-за отсутствия централизованной проверки идентичности.',
    en: 'Demonstrated at DEF CON 2019 on DSRC V2X systems. Also common in blockchain (51% attacks), P2P networks (BitTorrent), and social networks (bot farms). IEEE 802.11p V2X is particularly vulnerable due to lack of centralized identity verification.',
    tk: 'DEF CON 2019-da DSRC V2X ulgamlarynda görkezildi. Şeýle hem blokçeýnde (51% hüjümler), P2P torlarynda (BitTorrent) we sosial ulgamlarda (bot fermalary) giňden duşýar. IEEE 802.11p V2X merkezleşdirilen şahsyýet barlagy bolmansoň aýratyn ejiz.',
  },
  'attackInfo.sybil.historicalCase': {
    ru: 'В 2016 году исследователи Мичиганского университета продемонстрировали атаку Сивиллы на реальном V2X-полигоне, создав 100 фантомных машин. Системы предотвращения столкновений реальных автомобилей начали экстренное торможение. Статья: "Security Analysis of V2X Communications" (IEEE S&P 2016).',
    en: 'In 2016, researchers at University of Michigan demonstrated a Sybil attack on a real V2X testbed, creating 100 phantom vehicles that caused legitimate vehicles\' collision avoidance systems to trigger unnecessary emergency braking. Paper: "Security Analysis of V2X Communications" (IEEE S&P 2016).',
    tk: '2016-njy ýylda Miçigan uniwersitetiniň barlagçylary hakyky V2X synag meýdançasynda Sibil hüjümini görkezip, 100 arwah ulag döretdiler. Hakyky ulaglaryň çaknyşyk öňüni alyş ulgamlary gereksiz gyssagly tormozlamagy işjeňleşdirdi. Makala: "Security Analysis of V2X Communications" (IEEE S&P 2016).',
  },
  'attackInfo.sybil.consequences': {
    ru: 'При успехе: машины видят фантомные пробки и могут опасно перестроиться, экстренное торможение из-за несуществующих препятствий, оценки доверия рушатся и реальные предупреждения игнорируются, возможны цепные столкновения.',
    en: 'If successful: vehicles see phantom traffic jams and may reroute dangerously, emergency braking triggered by non-existent obstacles, trust scores collapse making real warnings ignored, possible chain-reaction collisions.',
    tk: 'Üstünlikli bolsa: ulaglar arwah dyknyşyklaryny görýär we howply ugruny üýtgedip biler, ýok päsgelçilikler sebäpli gyssagly tormoz, ynam ballary peseler we hakyky duýduryşlar äsgerilmez, zynjyr çaknyşyklary bolup biler.',
  },
  'attackInfo.sybil.technicalDetail': {
    ru: 'V2X использует PKI-сертификаты (IEEE 1609.2) для аутентификации. Атакующий либо ворует сертификаты, либо генерирует самоподписанные. SCMS (Security Credential Management System) должен отзывать скомпрометированные сертификаты через CRL (Certificate Revocation List), но задержка обновления CRL создаёт окно уязвимости.',
    en: 'V2X uses PKI certificates (IEEE 1609.2) for authentication. Attacker either steals certificates or generates self-signed ones. SCMS (Security Credential Management System) should revoke compromised certificates via CRL (Certificate Revocation List), but CRL update latency creates a vulnerability window.',
    tk: 'V2X autentifikasiýa üçin PKI şahadatnamalaryny (IEEE 1609.2) ulanýar. Hüjümçi şahadatnamalary ogurlaýar ýa-da öz-özüňe gol çekilen döredýär. SCMS CRL (Şahadatnama yzyna almak sanawy) arkaly bozulan şahadatnamalary yzyna almaly, emma CRL täzelenmesiniň gijä galmagy ejizlik penjiresini döredýär.',
  },

  // -- Replay Attack --
  'attackInfo.replay.whatIsIt': {
    ru: 'Повторная атака (Replay Attack) перехватывает легитимные V2X-сообщения и ретранслирует их позже. Атакующий записывает BSM-пакеты от реальных машин и воспроизводит их, создавая иллюзию присутствия автомобилей, которых уже нет на этом месте.',
    en: 'A Replay Attack intercepts legitimate V2X messages and retransmits them later. The attacker records BSM packets from real vehicles and replays them, creating the illusion of vehicles that are no longer present at that location.',
    tk: 'Gaýtadan hüjüm kanuny V2X habarlaryny tutýar we soňra gaýtadan iberýär. Hüjümçi hakyky ulaglardan BSM paketlerini ýazýar we gaýtadan oýnaýar, eýýäm şol ýerde bolmadyk ulaglaryň illýuziýasyny döredýär.',
  },
  'attackInfo.replay.howItWorks': {
    ru: '1) Хакер записывает BSM-сообщения возле перекрёстка. 2) Ждёт, пока автомобиль уедет. 3) Повторно передаёт те же BSM-пакеты. 4) Соседние машины думают, что автомобиль всё ещё на перекрёстке.',
    en: '1) Hacker records BSM messages near an intersection. 2) Waits until the vehicle leaves. 3) Re-transmits the same BSM packets. 4) Nearby vehicles think the car is still at the intersection.',
    tk: '1) Haker çatrygyň ýanynda BSM habarlaryny ýazýar. 2) Ulagyň gidmegine garaşýar. 3) Şol bir BSM paketlerini gaýtadan iberýär. 4) Golaýdaky ulaglar awtoulagyň henizem çatrykdadygyny pikir edýär.',
  },
  'attackInfo.replay.realWorldUsage': {
    ru: 'Повторные атаки — одна из первых угроз V2X, обнаруженных исследователями. Метки времени (timestamps) были введены в IEEE 1609.2 именно для защиты от них. Аналогичны повторным атакам в банковских системах (replay banking tokens).',
    en: 'Replay attacks were among the first V2X threats discovered by researchers. Timestamps were added to IEEE 1609.2 specifically to counter them. Analogous to replay attacks in banking systems (replay banking tokens).',
    tk: 'Gaýtadan hüjümler barlagçylar tarapyndan ýüze çykarylan ilkinji V2X howplardan biridi. Wagt belgileri olara garşy göreşmek üçin IEEE 1609.2-ä goşuldy. Bank ulgamlaryndaky gaýtadan hüjümlere meňzeş.',
  },
  'attackInfo.replay.historicalCase': {
    ru: 'В 2018 году группа из Virginia Tech продемонстрировала, что повторные BSM-сообщения могут заставить автопилот Tesla избегать несуществующих препятствий. Исследование привело к ужесточению требований к проверке актуальности сообщений в SAE J2945.',
    en: 'In 2018, a Virginia Tech team demonstrated that replayed BSM messages could trick Tesla Autopilot into avoiding non-existent obstacles. The research led to stricter message freshness requirements in SAE J2945.',
    tk: '2018-nji ýylda Virginia Tech topary gaýtadan oýnalan BSM habarlarynyň Tesla awtopiloty ýok päsgelçiliklerden gaça durmaga mejbur edip biljekdigini görkezdi. Barlag SAE J2945-de habar täzeligine has berk talaplara sebäp boldy.',
  },
  'attackInfo.replay.consequences': {
    ru: 'При успехе: автомобили видят фантомные машины на перекрёстках, системы предупреждения генерируют ложные сигналы, водители теряют доверие к V2X-предупреждениям.',
    en: 'If successful: vehicles detect phantom cars at intersections, warning systems generate false alerts, drivers lose trust in V2X warnings.',
    tk: 'Üstünlikli bolsa: ulaglar çatryşyklarda arwah ulaglary görýär, duýduryş ulgamlary ýalan seslenmeler döredýär, sürüjiler V2X duýduryşlaryna bolan ynamy ýitirýär.',
  },
  'attackInfo.replay.technicalDetail': {
    ru: 'Защита: метки времени с допуском 1-2 секунды (IEEE 1609.2), порядковые номера (nonce), GPS-синхронизация часов. Сложные атаки модифицируют timestamp в пакете, поэтому нужна криптографическая верификация подписи.',
    en: 'Defense: timestamps with 1-2 second tolerance (IEEE 1609.2), sequence numbers (nonce), GPS clock synchronization. Sophisticated attacks modify the timestamp, requiring cryptographic signature verification.',
    tk: 'Gorag: 1-2 sekunt çydamlylykly wagt belgileri (IEEE 1609.2), tertip belgileri (nonce), GPS sagat sinhronizasiýasy. Çylşyrymly hüjümler wagt belgisini üýtgedýär, kriptografiki gol barlagy zerur.',
  },

  // -- Position Falsification --
  'attackInfo.bogus.whatIsIt': {
    ru: 'Фальсификация позиции (Bogus Information) — атакующий передаёт ложные GPS-координаты в BSM-сообщениях. Это создаёт видимость нахождения автомобиля в другом месте, что может привести к опасным решениям автопилота соседних машин.',
    en: 'Position Falsification (Bogus Information) — the attacker transmits false GPS coordinates in BSM messages. This creates the appearance of a vehicle being in a different location, potentially causing dangerous autopilot decisions in nearby vehicles.',
    tk: 'Ýerleşiş galplaşdyrma (Bogus Information) — hüjümçi BSM habarlarynda ýalan GPS koordinatlaryny iberýär. Bu ulagyň başga ýerde bolýan ýaly görkezýär, golaýdaky ulaglaryň awtopilot kararlarynyň howply bolmagyna getirip biler.',
  },
  'attackInfo.bogus.howItWorks': {
    ru: '1) Хакер модифицирует GPS-данные в исходящих BSM-пакетах. 2) Передаёт координаты, отличные от реального положения. 3) Соседние автомобили принимают ложную позицию. 4) Системы предотвращения столкновений реагируют на несуществующую ситуацию.',
    en: '1) Hacker modifies GPS data in outgoing BSM packets. 2) Transmits coordinates different from actual position. 3) Nearby vehicles accept the false position. 4) Collision avoidance systems react to non-existent scenarios.',
    tk: '1) Haker çykýan BSM paketlerinde GPS maglumatlaryny üýtgedýär. 2) Hakyky ýerleşişden tapawutly koordinatlary iberýär. 3) Golaýdaky ulaglar ýalan ýerleşişi kabul edýär. 4) Çaknyşygyň öňüni alyş ulgamlary ýok ssenariýalara reaksiýa berýär.',
  },
  'attackInfo.bogus.realWorldUsage': {
    ru: 'Одна из самых распространённых V2X-атак. GPS-спуфинг активно используется в военных операциях (Иран, 2011 — захват дрона RQ-170). В гражданской V2X эта атака может создать видимость заблокированной полосы, заставляя машины тормозить.',
    en: 'One of the most common V2X attacks. GPS spoofing is actively used in military operations (Iran 2011 — RQ-170 drone capture). In civilian V2X, this attack can create the appearance of a blocked lane, forcing vehicles to brake.',
    tk: 'Iň giňden ýaýran V2X hüjümleriniň biri. GPS aldawy harby operasiýalarda işjeň ulanylýar (Eýran, 2011 — RQ-170 dron ele salynmagy). Raýat V2X-da bu hüjüm petiklenen zolagy emele getirip, ulaglary tormozlamaga mejbur edip biler.',
  },
  'attackInfo.bogus.historicalCase': {
    ru: 'В 2019 году исследователи из University of Texas продемонстрировали, что подмена GPS-координат на 10 метров достаточна для ложного срабатывания системы экстренного торможения в V2X-оснащённых автомобилях. Статья: "GPS Spoofing Attack Against V2X" (USENIX Security 2019).',
    en: 'In 2019, University of Texas researchers demonstrated that spoofing GPS coordinates by just 10 meters was sufficient to trigger false emergency braking in V2X-equipped vehicles. Paper: "GPS Spoofing Attack Against V2X" (USENIX Security 2019).',
    tk: '2019-njy ýylda Tehas uniwersitetiniň barlagçylary GPS koordinatlaryny bary-ýogy 10 metr aldamagyň V2X enjamly ulaglarda ýalan gyssagly tormozlamany işjeňleşdirmek üçin ýeterlikdigini görkezdi. Makala: "GPS Spoofing Attack Against V2X" (USENIX Security 2019).',
  },
  'attackInfo.bogus.consequences': {
    ru: 'При успехе: ложное экстренное торможение, опасная перестройка из-за фантомных препятствий, нарушение работы V2X-навигации, хаос в потоке трафика.',
    en: 'If successful: false emergency braking, dangerous lane changes due to phantom obstacles, V2X navigation disrupted, traffic flow chaos.',
    tk: 'Üstünlikli bolsa: ýalan gyssagly tormoz, arwah päsgelçilikler sebäpli howply zolak üýtgemegi, V2X nawigasiýasynyň bozulmagy, ulag akymynyň bulaşyklygy.',
  },
  'attackInfo.bogus.technicalDetail': {
    ru: 'BSM-пакеты (SAE J2735) содержат поля latitude/longitude/elevation. Проверка правдоподобности: скорость перемещения vs заявленные координаты (нельзя переместиться на 1 км за 1 секунду). Перекрёстная проверка с соседями (collaborative verification).',
    en: 'BSM packets (SAE J2735) contain latitude/longitude/elevation fields. Plausibility check: movement speed vs claimed coordinates (can\'t move 1km in 1 second). Cross-referencing with neighbors (collaborative verification).',
    tk: 'BSM paketlerinde (SAE J2735) latitude/longitude/elevation meýdanlary bar. Ynandyryjylyk barlagy: hereket tizligi vs beýan edilen koordinatlar (1 sekuntda 1km geçip bolmaýar). Goňşular bilen çapraz barlag (bilelikdäki barlag).',
  },

  // ===== DEFENSE INFO (educational deep content) =====
  // -- IDS --
  'defenseInfo.ids.whatIsIt': {
    ru: 'IDS (Intrusion Detection System) — система обнаружения вторжений, мониторящая V2X-сообщения в реальном времени и выявляющая аномальные паттерны: необычную частоту сообщений, невозможные скорости, подозрительные координаты.',
    en: 'IDS (Intrusion Detection System) monitors V2X messages in real-time and detects anomalous patterns: unusual message frequency, impossible speeds, suspicious coordinates.',
    tk: 'IDS (Aralaşmagy ýüze çykaryş ulgamy) V2X habarlaryny hakyky wagtda gözegçilik edýär we anomal nusgalary ýüze çykarýar: adaty bolmadyk habar ýygylygy, mümkin bolmadyk tizlikler, şübheli koordinatlar.',
  },
  'defenseInfo.ids.howItDetects': {
    ru: 'Анализирует статистические отклонения от нормального трафика: частота BSM > 50/сек — подозрительно, перемещение > 200 км/ч в городе — аномалия, множественные ID с одной точки — Сивилла.',
    en: 'Analyzes statistical deviations from normal traffic: BSM frequency > 50/sec is suspicious, movement > 200 km/h in city is anomaly, multiple IDs from one point — Sybil.',
    tk: 'Adaty ulag hereketinden statistiki gyşarmalary seljerýär: BSM ýygylygy > 50/sek şübheli, şäherde hereket > 200 km/sag anomaliýa, bir nokatdan köp ID — Sibil.',
  },
  'defenseInfo.ids.realDeployment': {
    ru: 'Используется в US DOT Connected Vehicle Pilot (Нью-Йорк, Тампа, Вайоминг). Аналогичные IDS работают в сетях LTE-V2X в Китае (C-V2X стандарт 3GPP).',
    en: 'Used in US DOT Connected Vehicle Pilot (New York, Tampa, Wyoming). Similar IDS systems operate in LTE-V2X networks in China (C-V2X standard 3GPP).',
    tk: 'ABŞ-nyň DOT Connected Vehicle Pilot-da (Nýu-York, Tampa, Waýoming) ulanylýar. Meňzeş IDS ulgamlary Hytaýda LTE-V2X torlarynda işleýär (C-V2X standarty 3GPP).',
  },
  'defenseInfo.ids.effectiveness': {
    ru: 'Обнаружение: 85-95% для простых атак, 55-70% для высокоуровневых. Ложные срабатывания: 5-15%. Время обнаружения: 0.1-2 секунды.',
    en: 'Detection: 85-95% for simple attacks, 55-70% for sophisticated ones. False positives: 5-15%. Detection time: 0.1-2 seconds.',
    tk: 'Ýüze çykarma: ýönekeý hüjümler üçin 85-95%, çylşyrymly üçin 55-70%. Ýalan oňyn: 5-15%. Ýüze çykarma wagty: 0.1-2 sekunt.',
  },
  'defenseInfo.ids.historicalCase': {
    ru: 'В 2020 году IDS в пилотном проекте Tampa Connected Vehicle Pilot обнаружила аномальный всплеск BSM-сообщений от неисправного OBU, предотвратив ложные предупреждения для 200+ автомобилей.',
    en: 'In 2020, IDS in the Tampa Connected Vehicle Pilot detected an anomalous spike of BSM messages from a faulty OBU, preventing false warnings for 200+ vehicles.',
    tk: '2020-nji ýylda Tampa Connected Vehicle Pilot-da IDS näsaz OBU-dan BSM habarlarynyň anomal ýokarlanmasyny ýüze çykardy we 200+ ulag üçin ýalan duýduryşlaryň öňüni aldy.',
  },

  // -- PKI --
  'defenseInfo.pki.whatIsIt': {
    ru: 'PKI (Public Key Infrastructure) и SCMS (Security Credential Management System) — проверяют цифровые подписи каждого V2X-сообщения, удостоверяя что отправитель — авторизованное транспортное средство.',
    en: 'PKI (Public Key Infrastructure) and SCMS (Security Credential Management System) verify digital signatures on every V2X message, ensuring the sender is an authorized vehicle.',
    tk: 'PKI (Açyk açar infrastrukturasy) we SCMS (Howpsuzlyk şahadatnama dolandyryş ulgamy) her V2X habarynyň sanly gollaryny barlaýar, iberijiniň ygtyýarlandyrylan ulagdygyny üpjün edýär.',
  },
  'defenseInfo.pki.howItDetects': {
    ru: 'Каждое BSM подписано сертификатом IEEE 1609.2. Проверяется: валидность подписи, срок действия сертификата, наличие в CRL (списке отозванных). Подделать подпись практически невозможно.',
    en: 'Every BSM is signed with IEEE 1609.2 certificate. Checks: signature validity, certificate expiration, presence in CRL (revocation list). Forging a signature is practically impossible.',
    tk: 'Her BSM IEEE 1609.2 şahadatnamasy bilen gol çekilýär. Barlaglar: goluň dogrulygy, şahadatnamanyň möhleti, CRL-da (yzyna almak sanawynda) barlygy. Goly galplaşdyrmak amaly taýdan mümkin däl.',
  },
  'defenseInfo.pki.realDeployment': {
    ru: 'SCMS развёрнут US DOT для всех V2X-пилотов в США. В Европе — C-ITS PKI (ETSI TS 103 097). Каждый автомобиль получает ~20 псевдонимных сертификатов в неделю для приватности.',
    en: 'SCMS deployed by US DOT for all V2X pilots in USA. In Europe — C-ITS PKI (ETSI TS 103 097). Each vehicle receives ~20 pseudonymous certificates per week for privacy.',
    tk: 'SCMS ABŞ-da ähli V2X pilotlary üçin ABŞ DOT tarapyndan ýerleşdirildi. Ýewropada — C-ITS PKI (ETSI TS 103 097). Her ulag gizlinlik üçin hepdede ~20 lakam şahadatnamasyny alýar.',
  },
  'defenseInfo.pki.effectiveness': {
    ru: 'Блокирует 90-95% простых атак (невалидные подписи). Против краденых валидных сертификатов менее эффективна — зависит от скорости обновления CRL.',
    en: 'Blocks 90-95% of simple attacks (invalid signatures). Less effective against stolen valid certificates — depends on CRL update speed.',
    tk: 'Ýönekeý hüjümleriň 90-95%-ini bloklýar (nädogry gollar). Ogurlanan dogry şahadatnamalara garşy az täsirli — CRL täzelenme tizligine bagly.',
  },
  'defenseInfo.pki.historicalCase': {
    ru: 'В 2021 году SCMS обнаружила и отозвала 50+ скомпрометированных сертификатов в Ann Arbor Connected Vehicle Pilot, когда исследователь случайно утечку ключей.',
    en: 'In 2021, SCMS detected and revoked 50+ compromised certificates in the Ann Arbor Connected Vehicle Pilot when a researcher accidentally leaked keys.',
    tk: '2021-nji ýylda SCMS Ann Arbor Connected Vehicle Pilot-da barlagçy tötänden açarlary syzdyranda 50+ bozulan şahadatnamany ýüze çykardy we yzyna aldy.',
  },

  // -- Misbehavior Detection --
  'defenseInfo.misbehavior.whatIsIt': {
    ru: 'Misbehavior Detection — система, проверяющая соответствие данных V2X-сообщений физическим законам. Если машина заявляет позицию в 1 км от предыдущей за 0.1 секунды — это физически невозможно.',
    en: 'Misbehavior Detection checks whether V2X message data complies with physics. If a vehicle claims a position 1 km from its previous one in 0.1 seconds — that\'s physically impossible.',
    tk: 'Nädogry hereket ýüze çykarma V2X habar maglumatlarynyň fizika laýyk gelýändigini barlaýar. Ulag 0.1 sekuntda öňki ýerinden 1 km pozisiýa beýan etse — bu fiziki taýdan mümkin däl.',
  },
  'defenseInfo.misbehavior.howItDetects': {
    ru: 'Проверки: скорость vs дистанция между BSM (закон кинематики), ускорение < физического лимита (~10 м/с²), позиция на допустимой дороге (не в здании), консистентность heading vs движения.',
    en: 'Checks: speed vs distance between BSMs (kinematics law), acceleration < physical limit (~10 m/s²), position on valid road (not inside buildings), heading vs movement consistency.',
    tk: 'Barlaglar: BSM-ler arasyndaky tizlik vs aralyk (kinematika kanuny), tizlenme < fiziki çäk (~10 m/s²), dogry ýolda pozisiýa (binanyň içinde däl), heading vs hereketiň sazlaşygy.',
  },
  'defenseInfo.misbehavior.realDeployment': {
    ru: 'Стандартизирована в ETSI TR 103 460 (Misbehavior Detection для C-ITS). Развёрнута в V2X-пилотах Audi и BMW в Германии (2021). Используется в Chinese CVIS (Cooperative Vehicle Infrastructure System).',
    en: 'Standardized in ETSI TR 103 460 (Misbehavior Detection for C-ITS). Deployed in Audi and BMW V2X pilots in Germany (2021). Used in Chinese CVIS (Cooperative Vehicle Infrastructure System).',
    tk: 'ETSI TR 103 460-da standartlaşdyryldy (C-ITS üçin nädogry hereket ýüze çykarma). Germaniýada Audi we BMW V2X pilotlarynda (2021) ýerleşdirildi. Hytaýyň CVIS-inde ulanylýar.',
  },
  'defenseInfo.misbehavior.effectiveness': {
    ru: 'Обнаруживает 75-95% фальсификации позиции (низкая сложность). Против постепенного дрейфа (высокая сложность) — 50%. Ложные срабатывания: 5-8%.',
    en: 'Detects 75-95% of position falsification (low sophistication). Against gradual drift (high sophistication) — 50%. False positives: 5-8%.',
    tk: 'Ýerleşiş galplaşdyrmasynyň 75-95%-ini (pes çylşyrymlylyk) ýüze çykarýar. Ýuwaş-ýuwaşdan süýşmä garşy (ýokary çylşyrymlylyk) — 50%. Ýalan oňyn: 5-8%.',
  },
  'defenseInfo.misbehavior.historicalCase': {
    ru: 'В 2022 году система Misbehavior Detection в пилоте Volkswagen Group обнаружила OBU с дефектным GPS-модулем, который передавал координаты с ошибкой 50м — и корректно отличила это от атаки.',
    en: 'In 2022, the Misbehavior Detection system in a Volkswagen Group pilot identified an OBU with a faulty GPS module transmitting coordinates with 50m error — and correctly distinguished it from an attack.',
    tk: '2022-nji ýylda Volkswagen Group-yň pilotynda nädogry hereket ýüze çykarma ulgamy 50m ýalňyşlyk bilen koordinatlar iberýän näsaz GPS modully OBU-ny tapdy — we ony hüjümden dogry tapawutlandyrdy.',
  },

  // -- Trust Scoring --
  'defenseInfo.trust.whatIsIt': {
    ru: 'Trust Scoring — динамическая система репутации, отслеживающая поведение каждого автомобиля. Изначально доверие ~0.9, при аномалиях падает, при нормальном поведении восстанавливается. Сообщения от автомобилей с низким доверием игнорируются.',
    en: 'Trust Scoring is a dynamic reputation system tracking each vehicle\'s behavior. Initial trust ~0.9, drops on anomalies, recovers with normal behavior. Messages from low-trust vehicles are ignored.',
    tk: 'Ynam ballary her ulagyň hereketini yzarlaýan dinamik abraý ulgamy. Ilkibaşdaky ynam ~0.9, anomaliýalarda peseler, adaty hereket bilen dikeldilýär. Pes ynam derejeli ulaglaryň habarlary äsgerilmeýär.',
  },
  'defenseInfo.trust.howItDetects': {
    ru: 'Баллы: каждое подтверждённое подозрение снижает доверие на 0.1-0.3. Порог изоляции: доверие < 0.3 → сообщения этого автомобиля игнорируются. Восстановление: +0.05 за каждые 100 нормальных BSM.',
    en: 'Scores: each confirmed suspicion reduces trust by 0.1-0.3. Isolation threshold: trust < 0.3 means messages ignored. Recovery: +0.05 per 100 normal BSMs.',
    tk: 'Ballar: her tassyklanan güman ynamy 0.1-0.3 azaldýar. Izolýasiýa bosagasy: ynam < 0.3 → habarlar äsgerilmeýär. Dikeltmek: her 100 adaty BSM üçin +0.05.',
  },
  'defenseInfo.trust.realDeployment': {
    ru: 'Реализована в ETSI TS 102 941 (V2X Trust Management). Используется в китайских V2X-пилотах (Wuxi, Changsha). Аналогичные системы в DeFi (decentralized finance) для оценки надёжности узлов.',
    en: 'Implemented in ETSI TS 102 941 (V2X Trust Management). Used in Chinese V2X pilots (Wuxi, Changsha). Similar systems in DeFi (decentralized finance) for node reliability scoring.',
    tk: 'ETSI TS 102 941-de (V2X Ynam dolandyryşy) durmuşa geçirildi. Hytaý V2X pilotlarynda (Wuxi, Çançşa) ulanylýar. DeFi-da düwünleriň ygtybarlylygyny bahalandyrmak üçin meňzeş ulgamlar.',
  },
  'defenseInfo.trust.effectiveness': {
    ru: 'Обнаружение: 60-85% (зависит от истории поведения). Слабость: опытные атакующие сначала зарабатывают высокое доверие, потом атакуют. Время до эффективности: 2-10 секунд.',
    en: 'Detection: 60-85% (depends on behavior history). Weakness: sophisticated attackers first earn high trust, then attack. Time to effectiveness: 2-10 seconds.',
    tk: 'Ýüze çykarma: 60-85% (hereket taryhyna bagly). Ejizlik: tejribeli hüjümçiler ilki ýokary ynam gazanýar, soň hüjüm edýär. Netijelilik wagty: 2-10 sekunt.',
  },
  'defenseInfo.trust.historicalCase': {
    ru: 'В пилоте US DOT в Вайоминге (2019) Trust Scoring выявила грузовик с постоянно заниженными данными о скорости — оказалось, водитель намеренно калибровал спидометр ниже для экономии топлива.',
    en: 'In the US DOT Wyoming pilot (2019), Trust Scoring identified a truck consistently underreporting speed — turned out the driver deliberately calibrated the speedometer lower to save fuel.',
    tk: 'ABŞ DOT Waýoming pilotynda (2019) Ynam ballary yzygiderli pes tizlik habar berýän ýük ulagyny tapdy — sürüjiniň ýangyç tygşytlamak üçin spidometri bilkastlaýyn pes kalibrländigini ýüze çykardy.',
  },

  // ===== LESSON PANEL UI LABELS =====
  'lesson.whatIsIt': {
    ru: 'Что это за атака?',
    en: 'What is this attack?',
    tk: 'Bu hüjüm näme?',
  },
  'lesson.howItWorks': {
    ru: 'Как это работает (в симуляции):',
    en: 'How it works (in this sim):',
    tk: 'Nähili işleýär (bu simulýasiýada):',
  },
  'lesson.currentProgress': {
    ru: 'Текущий прогресс:',
    en: 'Current progress:',
    tk: 'Häzirki öňegidişlik:',
  },
  'lesson.realWorldExample': {
    ru: 'Пример из реального мира:',
    en: 'Real-world example:',
    tk: 'Hakyky dünýä mysaly:',
  },
  'lesson.ifSucceeds': {
    ru: 'Если атака удастся:',
    en: 'If attack succeeds:',
    tk: 'Hüjüm üstünlikli bolsa:',
  },
  'lesson.technicalDetails': {
    ru: 'Технические детали',
    en: 'Technical details',
    tk: 'Tehniki jikme-jiklikler',
  },
  'lesson.whoBlocked': {
    ru: 'Кто заблокировал?',
    en: 'Who blocked it?',
    tk: 'Kim bloklady?',
  },
  'lesson.howBlocked': {
    ru: 'Как была заблокирована:',
    en: 'How it was blocked:',
    tk: 'Nähili bloklady:',
  },
  'lesson.realWorldParallel': {
    ru: 'Аналог в реальном мире:',
    en: 'Real-world parallel:',
    tk: 'Hakyky dünýä meňzeşligi:',
  },
  'lesson.defenseStats': {
    ru: 'Статистика защиты:',
    en: 'Defense stats:',
    tk: 'Gorag statistikasy:',
  },
  'lesson.whatHappened': {
    ru: 'Что произошло?',
    en: 'What happened?',
    tk: 'Näme boldy?',
  },
  'lesson.realWorldImpact': {
    ru: 'Последствия в реальном мире:',
    en: 'Real-world impact:',
    tk: 'Hakyky dünýä täsiri:',
  },
  'lesson.whyFailed': {
    ru: 'Почему защита не сработала:',
    en: 'Why defense failed:',
    tk: 'Gorag näme üçin şowsuz boldy:',
  },
  'lesson.lessonLearned': {
    ru: 'Урок:',
    en: 'Lesson learned:',
    tk: 'Alnan sapak:',
  },
  'lesson.vehicleCompromised': {
    ru: 'ТРАНСПОРТ СКОМПРОМЕТИРОВАН!',
    en: 'VEHICLE COMPROMISED!',
    tk: 'ULAG BOZULDY!',
  },
  'lesson.attackBlocked': {
    ru: 'АТАКА ЗАБЛОКИРОВАНА!',
    en: 'ATTACK BLOCKED!',
    tk: 'HÜJÜM BLOKLANAN!',
  },
  'lesson.blocked': {
    ru: 'Заблокировано',
    en: 'Blocked',
    tk: 'Bloklanan',
  },
  'lesson.passed': {
    ru: 'Прошло',
    en: 'Passed',
    tk: 'Geçdi',
  },
  'lesson.defenseExplain': {
    ru: 'Уровень защиты "{level}" обеспечивает {mult}x сопротивление и {chance}% шанс блокировки. Уровень "Высокий" даёт 3x сопротивление и 40% блокировки.',
    en: 'Defense level "{level}" provides {mult}x resistance and {chance}% block chance. "High" defense gives 3x resistance and 40% block chance.',
    tk: '"{level}" gorag derejesi {mult}x garşylyk we {chance}% blok mümkinçiligini üpjün edýär. "Ýokary" gorag 3x garşylyk we 40% blok mümkinçiligi berýär.',
  },
  'lesson.nhtsa': {
    ru: 'В реальных V2X-развёртываниях NHTSA (США) требует минимальный уровень безопасности для всех подключённых ТС (предложение FMVSS, 2023).',
    en: 'In real V2X deployments, NHTSA (USA) mandates minimum security levels for all connected vehicles (FMVSS proposal, 2023).',
    tk: 'Hakyky V2X ýerleşdirmelerinde NHTSA (ABŞ) ähli birikdirilen ulaglar üçin iň pes howpsuzlyk derejesini talap edýär (FMVSS teklibi, 2023).',
  },

  // ===== TUTORIAL =====
  'tutorial.step1': {
    ru: 'Нажмите "Старт", чтобы запустить симуляцию',
    en: 'Click "Start" to begin the simulation',
    tk: 'Simulýasiýany başlamak üçin "Başla" basyň',
  },
  'tutorial.step2': {
    ru: 'Выберите тип атаки, чтобы проверить безопасность V2X',
    en: 'Choose an attack type to test V2X security',
    tk: 'V2X howpsuzlygyny barlamak üçin hüjüm görnüşini saýlaň',
  },
  'tutorial.step3': {
    ru: 'Нажмите на любое транспортное средство для деталей',
    en: 'Click any vehicle to see its details',
    tk: 'Jikme-jiklikleri görmek üçin islendik ulaga basyň',
  },
  'tutorial.step4': {
    ru: 'Откройте журнал безопасности для подробностей атаки/защиты',
    en: 'Open the security log to see attack/defense details',
    tk: 'Hüjüm/gorag jikme-jikliklerini görmek üçin howpsuzlyk žurnalyny açyň',
  },
  'tutorial.skip': {
    ru: 'Пропустить',
    en: 'Skip',
    tk: 'Geçmek',
  },
  'tutorial.next': {
    ru: 'Далее',
    en: 'Next',
    tk: 'Indiki',
  },
  'tutorial.gotIt': {
    ru: 'Понял!',
    en: 'Got it!',
    tk: 'Düşündim!',
  },

  // ===== DASHBOARD =====
  'dashboard.attacks': {
    ru: 'Атаки',
    en: 'Attacks',
    tk: 'Hüjümler',
  },
  'dashboard.blocked': {
    ru: 'Блокировано',
    en: 'Blocked',
    tk: 'Bloklanan',
  },
}

function interpolate(template: string, params: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, String(value))
  }
  return result
}

export function useTranslation(lang: Lang) {
  return useMemo(() => {
    function t(key: string, params?: Record<string, string | number>): string {
      const entry = translations[key]
      if (!entry) return key
      const raw = entry[lang] || entry.ru || key
      if (params) return interpolate(raw, params)
      return raw
    }
    return { t, lang }
  }, [lang])
}

export default translations
