/**
* Parses an English string expression and produces a schedule that is
* compatible with Later.js.
*
* Examples:
*
* every 5 minutes between the 1st and 30th minute
* at 10:00 am on tues of may in 2012
* on the 15-20th day of march-dec
* every 20 seconds every 5 minutes every 4 hours between the 10th and 20th hour
*/
later.parse.text = function(str) {

  var recur = later.parse.recur,
      pos = 0,
      input = '',
      error;

  // Regex expressions for all of the valid tokens
  var TOKENTYPES = {
    eof: /^$/,
    rank: /^((\d+)(st|nd|rd|th)?|an|a)\b/,
    time: /^((([0]?[1-9]|1[0-2])(:[0-5]\d(\s)?)?(am|pm|a|p))|(([0]?\d|1\d|2[0-3]):[0-5]\d))\b/,
    dayName: /^((sun|mon|tue(s)?|wed(nes)?|thu(r(s)?)?|fri|sat(ur)?)(day)?(s)?)\b/,
    monthName: /^(jan(uary)?|feb(ruary)?|ma((r(ch)?)?|y)|apr(il)?|ju(ly|ne)|aug(ust)?|oct(ober)?|(sept|nov|dec)(ember)?)\b/,
    yearIndex: /^((20|19)\d\d)\b/,
    every: /^every\b/,
    everyday: /^everyday\b/,
    after: /^after\b/,
    before: /^before\b/,
    second: /^(s|sec(ond)?(s)?)\b/,
    minute: /^(m|min(ute)?(s)?)\b/,
    hour: /^(h|hour(s)?)\b/,
    day: /^(day(s)?( of the month)?)\b/,
    dayInstance: /^day instance\b/,
    dayOfWeek: /^day(s)? of the week\b/,
    dayOfYear: /^day(s)? of the year\b/,
    weekOfYear: /^week(s)?( of the year)?\b/,
    weekOfMonth: /^week(s)? of the month\b/,
    weekday: /^weekday(s)?\b/,
    weekend: /^weekend(s)?\b/,
    month: /^month(s)?\b/,
    year: /^year(s)?\b/,
    between: /^between( the)?|from\b/,
    start: /^(start(ing)? (at|on( the)?)?)\b/,
    at: /^(at|@)\b/,
    and: /^(,|and\b)/,
    except: /^(except\b)/,
    also: /(also)\b/,
    first: /^(first)\b/,
    last: /^last\b/,
    "in": /^in\b/,
    of: /^of\b/,
    onthe: /^on the\b/,
    on: /^on\b/,
    through: /(-|^(to|through|thru|until|til)\b)/,
    for: /^for\b/
  };

  // Array to convert string names to valid numerical values
  var NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7,
    aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, sun: 1, mon: 2, tue: 3,
    wed: 4, thu: 5, fri: 6, sat: 7, '1st': 1, fir: 1, '2nd': 2, sec: 2,
    '3rd': 3, thi: 3, '4th': 4, 'for': 4
  };

  var TIME_PERIOD_TYPES = [TOKENTYPES.second, TOKENTYPES.minute, TOKENTYPES.hour,
    TOKENTYPES.dayOfYear, TOKENTYPES.dayOfWeek,
    TOKENTYPES.dayInstance, TOKENTYPES.day, TOKENTYPES.month,
    TOKENTYPES.year, TOKENTYPES.weekOfMonth, TOKENTYPES.weekOfYear];

  /**
  * Bundles up the results of the peek operation into a token.
  *
  * @param {Int} start: The start position of the token
  * @param {Int} end: The end position of the token
  * @param {String} text: The actual text that was parsed
  * @param {TokenType} type: The TokenType of the token
  */
  function t(start, end, text, type) {
    return {startPos: start, endPos: end, text: text, type: type};
  }

  /**
  * Peeks forward to see if the next token is the expected token and
  * returns the token if found.  Pos is not moved during a Peek operation.
  *
  * @param {TokenType} exepected: The types of token to scan for
  */
  function peek(expected) {
    var scanTokens = expected instanceof Array ? expected : [expected],
        whiteSpace = /\s+/,
        token, curInput, m, scanToken, start, len;

    scanTokens.push(whiteSpace);

    // loop past any skipped tokens and only look for expected tokens
    start = pos;
    while (!token || token.type && token.type.toString() === whiteSpace.toString()) {
      len = -1;
      curInput = input.substring(start);
      token = t(start, start, input.split(whiteSpace)[0]);

      var i, length = scanTokens.length;
      for(i = 0; i < length; i++) {
        scanToken = scanTokens[i];
        m = scanToken.exec(curInput);
        if (m && m.index === 0 && m[0].length > len) {
          len = m[0].length;
          token = t(start, start + len, curInput.substring(0, len), scanToken);
        }
      }

      // update the start position if this token should be skipped
      if (token.type && token.type.toString() === whiteSpace.toString()) {
        start = token.endPos;
      }
    }

    if (token.type) {
      return token;
    }
    return null;
  }

  /**
  * Moves pos to the end of the expectedToken if it is found.
  *
  * @param {TokenType} exepectedToken: The types of token to scan for
  */
  function scan(expectedToken) {
    var token = peek(expectedToken);
    if (token) {
      accept(token);
    }
    return token;
  }

  function accept(token) {
    pos = token.endPos;
    return token;
  }

  function parseTime(r, through) {
    // year takes precedence over rank.
    var token = peek([TOKENTYPES.dayName, TOKENTYPES.yearIndex, TOKENTYPES.rank,
      TOKENTYPES.time, TOKENTYPES.monthName]);

    if (token) {
      if (token.type.toString() !== TOKENTYPES.time.toString()) {
        var values = [];
        var period = null;

        period = parsePeriodInstanceOrRange(token.type, through);
        values = period.values;
        while (maybeParseToken(TOKENTYPES.and)) {
          period = parsePeriodInstanceOrRange(token.type, through);
          values = values.concat(period.values);
        }

        r.on(values);

        if (token.type.toString() === TOKENTYPES.rank.toString()) {
          applyTimePeriod(r, period.type);
        } else {
          applyTimePeriod(r, token.type);
        }
      } else {
        parseTimeInstanceOrRange(r, token.type, through);
      }
    } else {
      error = pos;
    }
  }

  /**
  * Parses the next 'y-z' expression and returns the resulting valid
  * value array.
  *
  * @param {TokenType} tokenType: The type of range values allowed
  */
  function parsePeriodInstanceOrRange(tokenType, through) {
    var _through = through || TOKENTYPES.through;
    var start = parseTokenValue(tokenType);
    var period = maybeParseToken(TIME_PERIOD_TYPES);
    var end = maybeParseToken(_through) ? parseTokenValue(tokenType) : null;
    var values = [];

    if (end && tokenType.toString() === TOKENTYPES.rank.toString()) {
      period = maybeParseToken(TIME_PERIOD_TYPES);
    }

    if (tokenType.toString() !== TOKENTYPES.time.toString()) {
      var i = start;
      do {
        values.push(i);
        i++;
      } while (i <= end);
    } else {
      error = pos;
    }

    return {
      type: period && period.type,
      values: values
    };
  }

  function parseTimeInstanceOrRange(r, tokenType, through) {
    var _through = through || TOKENTYPES.through;
    var start = parseTokenValue(tokenType);
    var end = maybeParseToken(_through) ? parseTokenValue(tokenType) : null;

    if (end === null) {
      r.on(start);
    } else {
      r.after(start);
      applyTimePeriod(r, tokenType);
      r.before(end);
    }
    applyTimePeriod(r, tokenType);
  }

  function parseEveryRank(r) {
    var num;
    var start;
    var end;
    var token;

    // every hour, day, etc
    if (token = peek(TIME_PERIOD_TYPES)) {
      accept(token);
      r.every(1);
      applyTimePeriod(r, token.type);
    }
    else if (token = peek(TOKENTYPES.everyday)) {
      accept(token);
      r.every(1);
      applyTimePeriod(r, TOKENTYPES.dayOfWeek);
    }
    else {
      r.every(parseTokenValue(TOKENTYPES.rank));
      parseTimePeriod(r);
    }

    // between/starting with rank values has a special meaning inside an every.
    if (maybeParseToken(TOKENTYPES.start)) {
      num = parseTokenValue(TOKENTYPES.rank);
      r.startingOn(num);
      // Consume the time period token after "starting on the Nth <period>"
      maybeParseToken(TIME_PERIOD_TYPES);
    }
    else if (maybeParseToken(TOKENTYPES.between)) {
      // Be lenient and accept between with a different period type than the rank
      // specified in the associated every phrase.
      if (token = peek([TOKENTYPES.time, TOKENTYPES.dayName, TOKENTYPES.monthName, TOKENTYPES.yearIndex])) {
        parseOneTime(r, token.type, [TOKENTYPES.through, TOKENTYPES.and]);
      }
      else {
        start = parseTokenValue(TOKENTYPES.rank);
        if (maybeParseToken(TOKENTYPES.and)) {
          end = parseTokenValue(TOKENTYPES.rank);
          r.between(start, end);
        }
      }
    }
  }

  /**
  * Parses the next 'every (weekend|weekday|x) (starting on|between)' expression.
  *
  * @param {Recur} r: The recurrence to add the expression to
  */
  function parseEvery(r) {

    if (maybeParseToken(TOKENTYPES.weekend)) {
      r.on(NAMES.sun,NAMES.sat).dayOfWeek();
    }
    else if (maybeParseToken(TOKENTYPES.weekday)) {
      r.on(NAMES.mon,NAMES.tue,NAMES.wed,NAMES.thu,NAMES.fri).dayOfWeek();
    }
    else if (peek([TOKENTYPES.time, TOKENTYPES.dayName, TOKENTYPES.monthName])) {
      parseTime(r);
    }
    // every <rank> has a different meaning than every <day>. the former is a scalar.
    else {
      parseEveryRank(r);
    }
  }

  function parseFor(r) {
    var num = parseTokenValue(TOKENTYPES.rank);
    var period = parseToken(TIME_PERIOD_TYPES);

    var type = null;
    for (var t in TOKENTYPES) {
      if (TOKENTYPES[t].toString() === period.type.toString()) {
        type = t;
        break;
      }
    }

    if (!type) {
      error = pos;
    } else {
      const now = new Date();
      const nowPeriodValue = later[type].val(now);
      const end = later[type].next(now, nowPeriodValue + num);

      r.after(now).fullDate();
      r.before(end).fullDate();
    }
  }

  /**
  * Parses the next 'on the (first|last|x,y-z)' expression.
  *
  * @param {Recur} r: The recurrence to add the expression to
  */
  function parseOnThe(r) {
    if (maybeParseToken(TOKENTYPES.first)) {
      r.first();
      parseTimePeriod(r);
    }
    else if (maybeParseToken(TOKENTYPES.last)) {
      r.last();
      parseTimePeriod(r);
    }
    else {
      parseTime(r);
    }
  }

  function parseAfter(r) {
    if (peek(TOKENTYPES.time)) {
      r.after(parseTokenValue(TOKENTYPES.time)).time();
    }
    else {
      r.after(parseTokenValue(TOKENTYPES.rank));
      parseTimePeriod(r);
    }
  }

  function parseBefore(r) {
    if (peek(TOKENTYPES.time)) {
      r.before(parseTokenValue(TOKENTYPES.time)).time();
    }
    else {
      r.before(parseTokenValue(TOKENTYPES.rank));
      parseTimePeriod(r);
    }
  }

  function parseBetween(r) {
    var token = parseToken(TOKENTYPES.between);

    if (token.text === 'between') {
      parseTime(r, [TOKENTYPES.through, TOKENTYPES.and]);
    } else {
      parseTime(r);
    }
  }

  /**
  * Parses the schedule expression and returns the resulting schedules,
  * and exceptions.  Error will return the position in the string where
  * an error occurred, will be null if no errors were found in the
  * expression.
  *
  * @param {String} str: The schedule expression to parse
  */
  function parseScheduleExpr(str) {
    pos = 0;
    input = str;
    error = -1;

    var r = recur();
    while (pos < input.length && error < 0) {

      var token = peek([TOKENTYPES.every, TOKENTYPES.after, TOKENTYPES.before,
            TOKENTYPES.onthe, TOKENTYPES.on, TOKENTYPES.of, TOKENTYPES["in"],
            TOKENTYPES.at, TOKENTYPES.and, TOKENTYPES.except,
            TOKENTYPES.also, TOKENTYPES.for, TOKENTYPES.dayName, TOKENTYPES.everyday,
            TOKENTYPES.weekday, TOKENTYPES.weekend, TOKENTYPES.monthName,
            TOKENTYPES.time, TOKENTYPES.between, TOKENTYPES.eof]);

      var type = token ? token.type && token.type.toString() : null;

      switch (type) {
        case TOKENTYPES.every.toString():
          accept(token);
        case TOKENTYPES.weekday.toString():
        case TOKENTYPES.weekend.toString():
        case TOKENTYPES.dayName.toString():
        case TOKENTYPES.monthName.toString():
        case TOKENTYPES.time.toString():
        case TOKENTYPES.everyday.toString():
          parseEvery(r);
          break;
        case TOKENTYPES.for.toString():
          accept(token);
          parseFor(r);
          break;
        case TOKENTYPES.after.toString():
          accept(token);
          parseAfter(r);
          break;
        case TOKENTYPES.before.toString():
          accept(token);
          parseBefore(r);
          break;
        case TOKENTYPES.onthe.toString():
          accept(token);
          parseOnThe(r);
          break;
        case TOKENTYPES.on.toString():
        case TOKENTYPES.of.toString():
        case TOKENTYPES["in"].toString():
        case TOKENTYPES.at.toString():
          accept(token);
          parseTime(r);
          break;
        case TOKENTYPES.and.toString():
          accept(token);
          break;
        case TOKENTYPES.also.toString():
          accept(token);
          r.and();
          break;
        case TOKENTYPES.between.toString():
          parseBetween(r);
          break;
        case TOKENTYPES.except.toString():
          accept(token);
          r.except();
          break;
        case TOKENTYPES.eof.toString():
          accept(token);
          break;
        default:
          error = pos;
      }
    }

    return {schedules: r.schedules, exceptions: r.exceptions, error: error};
  }

  /**
  * Parses the next token representing a time period and adds it to
  * the provided recur object.
  *
  * @param {Recur} r: The recurrence to add the time period to
  */
  function parseTimePeriod(r) {
    var token = maybeParseTimePeriod(r);
    if (!token) {
      error = pos;
    }
    return token;
  }

  function maybeParseTimePeriod(r) {
    var token = maybeParseToken(TIME_PERIOD_TYPES);
    if (token) {
      applyTimePeriod(r, token.type);
    }
    return token;
  }

  function applyTimePeriod(r, type) {
    switch (type && type.toString()) {
      case TOKENTYPES.second.toString():
        r.second();
        break;
      case TOKENTYPES.minute.toString():
        r.minute();
        break;
      case TOKENTYPES.hour.toString():
        r.hour();
        break;
      case TOKENTYPES.dayOfYear.toString():
        r.dayOfYear();
        break;
      case TOKENTYPES.dayOfWeek.toString():
      case TOKENTYPES.dayName.toString():
      case TOKENTYPES.everyday.toString():
        r.dayOfWeek();
        break;
      case TOKENTYPES.dayInstance.toString():
        r.dayOfWeekCount();
        break;
      case TOKENTYPES.day.toString():
        r.dayOfMonth();
        break;
      case TOKENTYPES.weekOfMonth.toString():
        r.weekOfMonth();
        break;
      case TOKENTYPES.weekOfYear.toString():
        r.weekOfYear();
        break;
      case TOKENTYPES.month.toString():
      case TOKENTYPES.monthName.toString():
        r.month();
        break;
      case TOKENTYPES.year.toString():
      case TOKENTYPES.yearIndex.toString():
        r.year();
        break;
      case TOKENTYPES.time.toString():
        r.time();
        break;
      default:
        error = pos;
    }
  }

  /**
  * Checks the next token to see if it is of tokenType. Returns the token
  * if it is, null otherwise.
  *
  * @param {TokenType} tokenType: The type or types of token to parse
  */
  function maybeParseToken(tokenType) {
    var t = peek(tokenType);
    if (t) {
      t.text = convertString(t);
      return accept(t);
    }
    return t;
  }

  /**
  * Parses and returns the next token.
  *
  * @param {TokenType} tokenType: The type or types of token to parse
  */
  function parseToken(tokenType) {
    var t = scan(tokenType);
    if (t) {
      t.text = convertString(t);
    } else {
      error = pos;
    }
    return t;
  }

  /**
  * Returns the text value of the token that was parsed.
  *
  * @param {TokenType} tokenType: The type of token to parse
  */
  function parseTokenValue(tokenType) {
    return (parseToken(tokenType)).text;
  }

  /**
  * Converts a string value to a numerical value based on the type of
  * token that was parsed.
  *
  * @param {String} str: The schedule string to parse
  * @param {TokenType} tokenType: The type of token to convert
  */
  function convertString(token) {
    var str = token.text;
    var output = str;

    switch (token.type && token.type.toString()) {
      case TOKENTYPES.time.toString():
        var parts = str.split(/(:|am|pm|a|p)/).filter(function(s) { return s != '' });
        var hour = '00';
        var min = '00';

        if (parts.length != 2) {
          min = parts[2].trim();
        }

        hour = (parts[parts.length-1] === 'pm' || parts[parts.length-1] === 'p') && parts[0] < 12 ? parseInt(parts[0],10) + 12 : parts[0];
        output = (hour.length === 1 ? '0' : '') + hour + ":" + min;
        break;

      case TOKENTYPES.rank.toString():
        if (/^(an|a)/.test(str)) {
          output = 1;
        } else {
          output = parseInt((/^\d+/.exec(str))[0],10);
        }
        break;

      case TOKENTYPES.monthName.toString():
      case TOKENTYPES.dayName.toString():
        output = NAMES[str.substring(0,3)];
        break;
      case TOKENTYPES.yearIndex.toString():
        output = parseInt(str);
        break;
    }

    return output;
  }

  return parseScheduleExpr(str.toLowerCase());
};
