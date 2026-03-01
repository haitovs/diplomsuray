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

  // ===== NARRATOR =====
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
