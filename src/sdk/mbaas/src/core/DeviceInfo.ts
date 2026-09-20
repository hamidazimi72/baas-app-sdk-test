export type BrowserInfo = {
  browserName: string;
  browserVersion: string;
};

export type BrowserRule = {
  name: string;
  regex: RegExp;
  exclude?: RegExp[];
  condition?: RegExp;
};

export type DeviceInfoData = {
  browser: string;
  browserVersion: string;
  device: "Mobile" | "Desktop";
  deviceTimezone: string | null;
  deviceLanguage: string | null;
};

export class DeviceInfo {
  getDeviceInfo(): DeviceInfoData {
    const browserInfo = this.getBrowserInfo();

    return {
      browser: browserInfo.browserName,
      browserVersion: browserInfo.browserVersion,
      device: this.getDeviceType(),
      deviceTimezone: this.getDeviceTimezone(),
      deviceLanguage: this.getDeviceLanguage(),
    };
  }

  getDeviceLanguage(): string | null {
    const deviceLanguage =
      navigator.language ||
      (navigator as Navigator & { userLanguage?: string }).userLanguage ||
      null;

    return deviceLanguage;
  }

  getDeviceTimezone(): string | null {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;

    return deviceTimezone;
  }

  getDeviceType(): "Mobile" | "Desktop" {
    const mobileUserAgentRegex =
      /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

    return mobileUserAgentRegex.test(navigator.userAgent) ? "Mobile" : "Desktop";
  }

  getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent;

    const browsers: BrowserRule[] = [
      { name: "Microsoft Edge", regex: /Edg\/([\d.]+)/ },
      { name: "Opera", regex: /(?:Opera|OPR)\/([\d.]+)/ },
      { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
      {
        name: "Chrome",
        regex: /Chrome\/([\d.]+)/,
        exclude: [/Edg\//, /OPR\//],
      },
      {
        name: "Safari",
        regex: /Version\/([\d.]+)/,
        condition: /Safari\//,
      },
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      const excluded = browser.exclude?.some((ex) => ex.test(userAgent)) ?? false;
      const conditionPassed = browser.condition?.test(userAgent) ?? true;

      if (match && !excluded && conditionPassed) {
        return {
          browserName: browser.name,
          browserVersion: match[1] ?? "Unknown Version",
        };
      }
    }

    return {
      browserName: "Unknown Browser",
      browserVersion: "Unknown Version",
    };
  }
}
