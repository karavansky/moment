import { ComponentType } from 'react'
import * as flags from 'country-flag-icons/react/3x2'

export interface CountryData {
  name: string
  prefix: string
  flag: ComponentType<{ className?: string }>
}

export class CountriesHelper {
  private static countries: Record<string, CountryData> = {
    // ...sorted by country name
    af: { name: 'Afghanistan', prefix: '+93', flag: flags.AF },
    al: { name: 'Albania', prefix: '+355', flag: flags.AL },
    dz: { name: 'Algeria', prefix: '+213', flag: flags.DZ },
    as: { name: 'American Samoa', prefix: '+1-684', flag: flags.AS },
    ad: { name: 'Andorra', prefix: '+376', flag: flags.AD },
    ao: { name: 'Angola', prefix: '+244', flag: flags.AO },
    ai: { name: 'Anguilla', prefix: '+1-264', flag: flags.AI },
    aq: { name: 'Antarctica', prefix: '+672', flag: flags.AQ },
    ag: { name: 'Antigua and Barbuda', prefix: '+1-268', flag: flags.AG },
    ar: { name: 'Argentina', prefix: '+54', flag: flags.AR },
    am: { name: 'Armenia', prefix: '+374', flag: flags.AM },
    aw: { name: 'Aruba', prefix: '+297', flag: flags.AW },
    au: { name: 'Australia', prefix: '+61', flag: flags.AU },
    at: { name: 'Austria', prefix: '+43', flag: flags.AT },
    az: { name: 'Azerbaijan', prefix: '+994', flag: flags.AZ },
    bs: { name: 'Bahamas', prefix: '+1-242', flag: flags.BS },
    bh: { name: 'Bahrain', prefix: '+973', flag: flags.BH },
    bd: { name: 'Bangladesh', prefix: '+880', flag: flags.BD },
    bb: { name: 'Barbados', prefix: '+1-246', flag: flags.BB },
    by: { name: 'Belarus', prefix: '+375', flag: flags.BY },
    be: { name: 'Belgium', prefix: '+32', flag: flags.BE },
    bz: { name: 'Belize', prefix: '+501', flag: flags.BZ },
    bj: { name: 'Benin', prefix: '+229', flag: flags.BJ },
    bm: { name: 'Bermuda', prefix: '+1-441', flag: flags.BM },
    bt: { name: 'Bhutan', prefix: '+975', flag: flags.BT },
    bo: { name: 'Bolivia', prefix: '+591', flag: flags.BO },
    ba: { name: 'Bosnia and Herzegovina', prefix: '+387', flag: flags.BA },
    bw: { name: 'Botswana', prefix: '+267', flag: flags.BW },
    br: { name: 'Brazil', prefix: '+55', flag: flags.BR },
    io: { name: 'British Indian Ocean Territory', prefix: '+246', flag: flags.IO },
    vg: { name: 'British Virgin Islands', prefix: '+1-284', flag: flags.VG },
    bn: { name: 'Brunei', prefix: '+673', flag: flags.BN },
    bg: { name: 'Bulgaria', prefix: '+359', flag: flags.BG },
    bf: { name: 'Burkina Faso', prefix: '+226', flag: flags.BF },
    bi: { name: 'Burundi', prefix: '+257', flag: flags.BI },
    kh: { name: 'Cambodia', prefix: '+855', flag: flags.KH },
    cm: { name: 'Cameroon', prefix: '+237', flag: flags.CM },
    ca: { name: 'Canada', prefix: '+1', flag: flags.CA },
    cv: { name: 'Cape Verde', prefix: '+238', flag: flags.CV },
    bq: { name: 'Caribbean Netherlands', prefix: '+599', flag: flags.BQ },
    ky: { name: 'Cayman Islands', prefix: '+1-345', flag: flags.KY },
    cf: { name: 'Central African Republic', prefix: '+236', flag: flags.CF },
    td: { name: 'Chad', prefix: '+235', flag: flags.TD },
    cl: { name: 'Chile', prefix: '+56', flag: flags.CL },
    cn: { name: 'China', prefix: '+86', flag: flags.CN },
    cx: { name: 'Christmas Island', prefix: '+61', flag: flags.CX },
    cc: { name: 'Cocos Islands', prefix: '+61', flag: flags.CC },
    co: { name: 'Colombia', prefix: '+57', flag: flags.CO },
    km: { name: 'Comoros', prefix: '+269', flag: flags.KM },
    cg: { name: 'Congo (Republic)', prefix: '+242', flag: flags.CG },
    cd: { name: 'Congo (DRC)', prefix: '+243', flag: flags.CD },
    ck: { name: 'Cook Islands', prefix: '+682', flag: flags.CK },
    cr: { name: 'Costa Rica', prefix: '+506', flag: flags.CR },
    ci: { name: 'Côte d\'Ivoire', prefix: '+225', flag: flags.CI },
    hr: { name: 'Croatia', prefix: '+385', flag: flags.HR },
    cu: { name: 'Cuba', prefix: '+53', flag: flags.CU },
    cw: { name: 'Curaçao', prefix: '+599', flag: flags.CW },
    cy: { name: 'Cyprus', prefix: '+357', flag: flags.CY },
    cz: { name: 'Czech Republic', prefix: '+420', flag: flags.CZ },
    dk: { name: 'Denmark', prefix: '+45', flag: flags.DK },
    dj: { name: 'Djibouti', prefix: '+253', flag: flags.DJ },
    dm: { name: 'Dominica', prefix: '+1-767', flag: flags.DM },
    do: { name: 'Dominican Republic', prefix: '+1-809', flag: flags.DO },
    ec: { name: 'Ecuador', prefix: '+593', flag: flags.EC },
    eg: { name: 'Egypt', prefix: '+20', flag: flags.EG },
    sv: { name: 'El Salvador', prefix: '+503', flag: flags.SV },
    gq: { name: 'Equatorial Guinea', prefix: '+240', flag: flags.GQ },
    er: { name: 'Eritrea', prefix: '+291', flag: flags.ER },
    ee: { name: 'Estonia', prefix: '+372', flag: flags.EE },
    sz: { name: 'Eswatini', prefix: '+268', flag: flags.SZ },
    et: { name: 'Ethiopia', prefix: '+251', flag: flags.ET },
    fk: { name: 'Falkland Islands', prefix: '+500', flag: flags.FK },
    fo: { name: 'Faroe Islands', prefix: '+298', flag: flags.FO },
    fj: { name: 'Fiji', prefix: '+679', flag: flags.FJ },
    fi: { name: 'Finland', prefix: '+358', flag: flags.FI },
    fr: { name: 'France', prefix: '+33', flag: flags.FR },
    gf: { name: 'French Guiana', prefix: '+594', flag: flags.GF },
    pf: { name: 'French Polynesia', prefix: '+689', flag: flags.PF },
    tf: { name: 'French Southern Territories', prefix: '+262', flag: flags.TF },
    ga: { name: 'Gabon', prefix: '+241', flag: flags.GA },
    gm: { name: 'Gambia', prefix: '+220', flag: flags.GM },
    ge: { name: 'Georgia', prefix: '+995', flag: flags.GE },
    de: { name: 'Germany', prefix: '+49', flag: flags.DE },
    gh: { name: 'Ghana', prefix: '+233', flag: flags.GH },
    gi: { name: 'Gibraltar', prefix: '+350', flag: flags.GI },
    gr: { name: 'Greece', prefix: '+30', flag: flags.GR },
    gl: { name: 'Greenland', prefix: '+299', flag: flags.GL },
    gd: { name: 'Grenada', prefix: '+1-473', flag: flags.GD },
    gp: { name: 'Guadeloupe', prefix: '+590', flag: flags.GP },
    gu: { name: 'Guam', prefix: '+1-671', flag: flags.GU },
    gt: { name: 'Guatemala', prefix: '+502', flag: flags.GT },
    gg: { name: 'Guernsey', prefix: '+44', flag: flags.GG },
    gn: { name: 'Guinea', prefix: '+224', flag: flags.GN },
    gw: { name: 'Guinea-Bissau', prefix: '+245', flag: flags.GW },
    gy: { name: 'Guyana', prefix: '+592', flag: flags.GY },
    ht: { name: 'Haiti', prefix: '+509', flag: flags.HT },
    hm: { name: 'Heard Island and McDonald Islands', prefix: '+672', flag: flags.HM },
    va: { name: 'Vatican City', prefix: '+379', flag: flags.VA },
    hn: { name: 'Honduras', prefix: '+504', flag: flags.HN },
    hk: { name: 'Hong Kong', prefix: '+852', flag: flags.HK },
    hu: { name: 'Hungary', prefix: '+36', flag: flags.HU },
    is: { name: 'Iceland', prefix: '+354', flag: flags.IS },
    in: { name: 'India', prefix: '+91', flag: flags.IN },
    id: { name: 'Indonesia', prefix: '+62', flag: flags.ID },
    ir: { name: 'Iran', prefix: '+98', flag: flags.IR },
    iq: { name: 'Iraq', prefix: '+964', flag: flags.IQ },
    ie: { name: 'Ireland', prefix: '+353', flag: flags.IE },
    im: { name: 'Isle of Man', prefix: '+44', flag: flags.IM },
    il: { name: 'Israel', prefix: '+972', flag: flags.IL },
    it: { name: 'Italy', prefix: '+39', flag: flags.IT },
    jm: { name: 'Jamaica', prefix: '+1-876', flag: flags.JM },
    jp: { name: 'Japan', prefix: '+81', flag: flags.JP },
    je: { name: 'Jersey', prefix: '+44', flag: flags.JE },
    jo: { name: 'Jordan', prefix: '+962', flag: flags.JO },
    kz: { name: 'Kazakhstan', prefix: '+7', flag: flags.KZ },
    ke: { name: 'Kenya', prefix: '+254', flag: flags.KE },
    ki: { name: 'Kiribati', prefix: '+686', flag: flags.KI },
    xk: { name: 'Kosovo', prefix: '+383', flag: flags.XK },
    kw: { name: 'Kuwait', prefix: '+965', flag: flags.KW },
    kg: { name: 'Kyrgyzstan', prefix: '+996', flag: flags.KG },
    la: { name: 'Laos', prefix: '+856', flag: flags.LA },
    lv: { name: 'Latvia', prefix: '+371', flag: flags.LV },
    lb: { name: 'Lebanon', prefix: '+961', flag: flags.LB },
    ls: { name: 'Lesotho', prefix: '+266', flag: flags.LS },
    lr: { name: 'Liberia', prefix: '+231', flag: flags.LR },
    ly: { name: 'Libya', prefix: '+218', flag: flags.LY },
    li: { name: 'Liechtenstein', prefix: '+423', flag: flags.LI },
    lt: { name: 'Lithuania', prefix: '+370', flag: flags.LT },
    lu: { name: 'Luxembourg', prefix: '+352', flag: flags.LU },
    mo: { name: 'Macau', prefix: '+853', flag: flags.MO },
    mg: { name: 'Madagascar', prefix: '+261', flag: flags.MG },
    mw: { name: 'Malawi', prefix: '+265', flag: flags.MW },
    my: { name: 'Malaysia', prefix: '+60', flag: flags.MY },
    mv: { name: 'Maldives', prefix: '+960', flag: flags.MV },
    ml: { name: 'Mali', prefix: '+223', flag: flags.ML },
    mt: { name: 'Malta', prefix: '+356', flag: flags.MT },
    mh: { name: 'Marshall Islands', prefix: '+692', flag: flags.MH },
    mq: { name: 'Martinique', prefix: '+596', flag: flags.MQ },
    mr: { name: 'Mauritania', prefix: '+222', flag: flags.MR },
    mu: { name: 'Mauritius', prefix: '+230', flag: flags.MU },
    yt: { name: 'Mayotte', prefix: '+262', flag: flags.YT },
    mx: { name: 'Mexico', prefix: '+52', flag: flags.MX },
    fm: { name: 'Micronesia', prefix: '+691', flag: flags.FM },
    md: { name: 'Moldova', prefix: '+373', flag: flags.MD },
    mc: { name: 'Monaco', prefix: '+377', flag: flags.MC },
    mn: { name: 'Mongolia', prefix: '+976', flag: flags.MN },
    me: { name: 'Montenegro', prefix: '+382', flag: flags.ME },
    ms: { name: 'Montserrat', prefix: '+1-664', flag: flags.MS },
    ma: { name: 'Morocco', prefix: '+212', flag: flags.MA },
    mz: { name: 'Mozambique', prefix: '+258', flag: flags.MZ },
    mm: { name: 'Myanmar', prefix: '+95', flag: flags.MM },
    na: { name: 'Namibia', prefix: '+264', flag: flags.NA },
    nr: { name: 'Nauru', prefix: '+674', flag: flags.NR },
    np: { name: 'Nepal', prefix: '+977', flag: flags.NP },
    nl: { name: 'Netherlands', prefix: '+31', flag: flags.NL },
    nc: { name: 'New Caledonia', prefix: '+687', flag: flags.NC },
    nz: { name: 'New Zealand', prefix: '+64', flag: flags.NZ },
    ni: { name: 'Nicaragua', prefix: '+505', flag: flags.NI },
    ne: { name: 'Niger', prefix: '+227', flag: flags.NE },
    ng: { name: 'Nigeria', prefix: '+234', flag: flags.NG },
    nu: { name: 'Niue', prefix: '+683', flag: flags.NU },
    nf: { name: 'Norfolk Island', prefix: '+672', flag: flags.NF },
    kp: { name: 'North Korea', prefix: '+850', flag: flags.KP },
    mk: { name: 'North Macedonia', prefix: '+389', flag: flags.MK },
    mp: { name: 'Northern Mariana Islands', prefix: '+1-670', flag: flags.MP },
    no: { name: 'Norway', prefix: '+47', flag: flags.NO },
    om: { name: 'Oman', prefix: '+968', flag: flags.OM },
    pk: { name: 'Pakistan', prefix: '+92', flag: flags.PK },
    pw: { name: 'Palau', prefix: '+680', flag: flags.PW },
    ps: { name: 'Palestine', prefix: '+970', flag: flags.PS },
    pa: { name: 'Panama', prefix: '+507', flag: flags.PA },
    pg: { name: 'Papua New Guinea', prefix: '+675', flag: flags.PG },
    py: { name: 'Paraguay', prefix: '+595', flag: flags.PY },
    pe: { name: 'Peru', prefix: '+51', flag: flags.PE },
    ph: { name: 'Philippines', prefix: '+63', flag: flags.PH },
    pn: { name: 'Pitcairn Islands', prefix: '+64', flag: flags.PN },
    pl: { name: 'Poland', prefix: '+48', flag: flags.PL },
    pt: { name: 'Portugal', prefix: '+351', flag: flags.PT },
    pr: { name: 'Puerto Rico', prefix: '+1-787', flag: flags.PR },
    qa: { name: 'Qatar', prefix: '+974', flag: flags.QA },
    re: { name: 'Réunion', prefix: '+262', flag: flags.RE },
    ro: { name: 'Romania', prefix: '+40', flag: flags.RO },
    ru: { name: 'Russia', prefix: '+7', flag: flags.RU },
    rw: { name: 'Rwanda', prefix: '+250', flag: flags.RW },
    bl: { name: 'Saint Barthélemy', prefix: '+590', flag: flags.BL },
    sh: { name: 'Saint Helena', prefix: '+290', flag: flags.SH },
    kn: { name: 'Saint Kitts and Nevis', prefix: '+1-869', flag: flags.KN },
    lc: { name: 'Saint Lucia', prefix: '+1-758', flag: flags.LC },
    mf: { name: 'Saint Martin', prefix: '+590', flag: flags.MF },
    pm: { name: 'Saint Pierre and Miquelon', prefix: '+508', flag: flags.PM },
    vc: { name: 'Saint Vincent and the Grenadines', prefix: '+1-784', flag: flags.VC },
    ws: { name: 'Samoa', prefix: '+685', flag: flags.WS },
    sm: { name: 'San Marino', prefix: '+378', flag: flags.SM },
    st: { name: 'São Tomé and Príncipe', prefix: '+239', flag: flags.ST },
    sa: { name: 'Saudi Arabia', prefix: '+966', flag: flags.SA },
    sn: { name: 'Senegal', prefix: '+221', flag: flags.SN },
    rs: { name: 'Serbia', prefix: '+381', flag: flags.RS },
    sc: { name: 'Seychelles', prefix: '+248', flag: flags.SC },
    sl: { name: 'Sierra Leone', prefix: '+232', flag: flags.SL },
    sg: { name: 'Singapore', prefix: '+65', flag: flags.SG },
    sx: { name: 'Sint Maarten', prefix: '+1-721', flag: flags.SX },
    sk: { name: 'Slovakia', prefix: '+421', flag: flags.SK },
    si: { name: 'Slovenia', prefix: '+386', flag: flags.SI },
    sb: { name: 'Solomon Islands', prefix: '+677', flag: flags.SB },
    so: { name: 'Somalia', prefix: '+252', flag: flags.SO },
    za: { name: 'South Africa', prefix: '+27', flag: flags.ZA },
    gs: { name: 'South Georgia and the South Sandwich Islands', prefix: '+500', flag: flags.GS },
    kr: { name: 'South Korea', prefix: '+82', flag: flags.KR },
    ss: { name: 'South Sudan', prefix: '+211', flag: flags.SS },
    es: { name: 'Spain', prefix: '+34', flag: flags.ES },
    lk: { name: 'Sri Lanka', prefix: '+94', flag: flags.LK },
    sd: { name: 'Sudan', prefix: '+249', flag: flags.SD },
    sr: { name: 'Suriname', prefix: '+597', flag: flags.SR },
    sj: { name: 'Svalbard and Jan Mayen', prefix: '+47', flag: flags.SJ },
    se: { name: 'Sweden', prefix: '+46', flag: flags.SE },
    ch: { name: 'Switzerland', prefix: '+41', flag: flags.CH },
    sy: { name: 'Syria', prefix: '+963', flag: flags.SY },
    tw: { name: 'Taiwan', prefix: '+886', flag: flags.TW },
    tj: { name: 'Tajikistan', prefix: '+992', flag: flags.TJ },
    tz: { name: 'Tanzania', prefix: '+255', flag: flags.TZ },
    th: { name: 'Thailand', prefix: '+66', flag: flags.TH },
    tl: { name: 'Timor-Leste', prefix: '+670', flag: flags.TL },
    tg: { name: 'Togo', prefix: '+228', flag: flags.TG },
    tk: { name: 'Tokelau', prefix: '+690', flag: flags.TK },
    to: { name: 'Tonga', prefix: '+676', flag: flags.TO },
    tt: { name: 'Trinidad and Tobago', prefix: '+1-868', flag: flags.TT },
    tn: { name: 'Tunisia', prefix: '+216', flag: flags.TN },
    tr: { name: 'Turkey', prefix: '+90', flag: flags.TR },
    tm: { name: 'Turkmenistan', prefix: '+993', flag: flags.TM },
    tc: { name: 'Turks and Caicos Islands', prefix: '+1-649', flag: flags.TC },
    tv: { name: 'Tuvalu', prefix: '+688', flag: flags.TV },
    ug: { name: 'Uganda', prefix: '+256', flag: flags.UG },
    ua: { name: 'Ukraine', prefix: '+380', flag: flags.UA },
    ae: { name: 'United Arab Emirates', prefix: '+971', flag: flags.AE },
    gb: { name: 'United Kingdom', prefix: '+44', flag: flags.GB },
    us: { name: 'United States', prefix: '+1', flag: flags.US },
    uy: { name: 'Uruguay', prefix: '+598', flag: flags.UY },
    uz: { name: 'Uzbekistan', prefix: '+998', flag: flags.UZ },
    vu: { name: 'Vanuatu', prefix: '+678', flag: flags.VU },
    ve: { name: 'Venezuela', prefix: '+58', flag: flags.VE },
    vn: { name: 'Vietnam', prefix: '+84', flag: flags.VN },
    wf: { name: 'Wallis and Futuna', prefix: '+681', flag: flags.WF },
    eh: { name: 'Western Sahara', prefix: '+212', flag: flags.EH },
    ye: { name: 'Yemen', prefix: '+967', flag: flags.YE },
    zm: { name: 'Zambia', prefix: '+260', flag: flags.ZM },
    zw: { name: 'Zimbabwe', prefix: '+263', flag: flags.ZW },
    ax: { name: 'Åland Islands', prefix: '+358-18', flag: flags.AX },
    
  }
   
  // Получить данные страны по коду
  static getCountryByCode(code: string): CountryData | undefined {
    return this.countries[code.toLowerCase()]
  }

  // Получить код страны по названию
  static getCodeByName(name: string): string | undefined {
    const entry = Object.entries(this.countries).find(
      ([, data]) => data.name.toLowerCase() === name.toLowerCase()
    )
    return entry?.[0]
  }

  // Получить все страны как массив для рендеринга
  static getAllCountries(): Array<{ code: string; data: CountryData }> {
    return Object.entries(this.countries).map(([code, data]) => ({
      code,
      data,
    }))
  }

  // Получить префикс по коду страны
  static getPrefixByCode(code: string): string | undefined {
    return this.countries[code.toLowerCase()]?.prefix
  }

  // Получить название по коду страны
  static getNameByCode(code: string): string | undefined {
    return this.countries[code.toLowerCase()]?.name
  }

  // Получить флаг по коду страны
  static getFlagByCode(code: string): ComponentType<{ className?: string }> | undefined {
    return this.countries[code.toLowerCase()]?.flag
  }

  // Проверить существует ли страна с таким кодом
  static isValidCode(code: string): boolean {
    return code.toLowerCase() in this.countries
  }

  // Получить код страны по префиксу телефона
  static getCodeByPrefix(prefix: string): string | undefined {
    const normalizedPrefix = prefix.startsWith('+') ? prefix : `+${prefix}`
    const entry = Object.entries(this.countries).find(
      ([, data]) => data.prefix === normalizedPrefix
    )
    return entry?.[0]
  }
}
