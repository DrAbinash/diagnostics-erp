import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

interface SystemSettings {
  clinic: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
    timezone: string;
    locale: string;
  };
  network: {
    publicUrl: string;
    nasHost: string;
    apiPort: number;
    webPort: number;
    dicomPort: number;
  };
  radiology: {
    modalities: string[];
    aeTitle: string;
    viewerEnabled: boolean;
    defaultTemplates: string[];
  };
  notifications: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpFrom: string;
    whatsappEnabled: boolean;
  };
  security: {
    totpIssuer: string;
    sessionTtlHours: number;
    secretRotationDue: boolean;
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    favicon: string;
    loginTagline: string;
  };
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/admin");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      const parsed: SystemSettings = {
        clinic: data.settings.clinic?.value || {},
        network: data.settings.network?.value || {},
        radiology: data.settings.radiology?.value || {},
        notifications: data.settings.notifications?.value || {},
        security: data.settings.security?.value || {},
        branding: data.settings.branding?.value || {},
      };
      setSettings(parsed);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (group: keyof SystemSettings) => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [group]: settings[group] }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast({ title: "Success", description: `${group} settings saved` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (group: keyof SystemSettings, field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [group]: { ...settings[group], [field]: value },
    });
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="p-6">Failed to load settings</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="System Settings" subtitle="Configure your clinic's system-wide settings" />

      <Tabs defaultValue="clinic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinic">Clinic</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="radiology">Radiology</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Clinic Name</Label>
                <Input
                  value={settings.clinic.name || ""}
                  onChange={(e) => updateField("clinic", "name", e.target.value)}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={settings.clinic.address || ""}
                  onChange={(e) => updateField("clinic", "address", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={settings.clinic.phone || ""}
                  onChange={(e) => updateField("clinic", "phone", e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={settings.clinic.email || ""}
                  onChange={(e) => updateField("clinic", "email", e.target.value)}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={settings.clinic.logoUrl || ""}
                  onChange={(e) => updateField("clinic", "logoUrl", e.target.value)}
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  value={settings.clinic.timezone || ""}
                  onChange={(e) => updateField("clinic", "timezone", e.target.value)}
                />
              </div>
              <Button onClick={() => saveSettings("clinic")} disabled={saving}>
                {saving ? "Saving..." : "Save Clinic Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Public URL</Label>
                <Input
                  value={settings.network.publicUrl || ""}
                  onChange={(e) => updateField("network", "publicUrl", e.target.value)}
                  placeholder="https://yourclinic.com"
                />
              </div>
              <div>
                <Label>NAS Host</Label>
                <Input
                  value={settings.network.nasHost || ""}
                  onChange={(e) => updateField("network", "nasHost", e.target.value)}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label>API Port</Label>
                <Input
                  type="number"
                  value={settings.network.apiPort || 8200}
                  onChange={(e) => updateField("network", "apiPort", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Web Port</Label>
                <Input
                  type="number"
                  value={settings.network.webPort || 3100}
                  onChange={(e) => updateField("network", "webPort", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>DICOM Port</Label>
                <Input
                  type="number"
                  value={settings.network.dicomPort || 6433}
                  onChange={(e) => updateField("network", "dicomPort", Number(e.target.value))}
                />
              </div>
              <Button onClick={() => saveSettings("network")} disabled={saving}>
                {saving ? "Saving..." : "Save Network Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radiology">
          <Card>
            <CardHeader>
              <CardTitle>Radiology Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AE Title</Label>
                <Input
                  value={settings.radiology.aeTitle || ""}
                  onChange={(e) => updateField("radiology", "aeTitle", e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="viewerEnabled"
                  checked={settings.radiology.viewerEnabled || false}
                  onChange={(e) => updateField("radiology", "viewerEnabled", e.target.checked)}
                />
                <Label htmlFor="viewerEnabled">Enable Web Viewer</Label>
              </div>
              <Button onClick={() => saveSettings("radiology")} disabled={saving}>
                {saving ? "Saving..." : "Save Radiology Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>SMTP Host</Label>
                <Input
                  value={settings.notifications.smtpHost || ""}
                  onChange={(e) => updateField("notifications", "smtpHost", e.target.value)}
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  type="number"
                  value={settings.notifications.smtpPort || 587}
                  onChange={(e) => updateField("notifications", "smtpPort", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>SMTP User</Label>
                <Input
                  value={settings.notifications.smtpUser || ""}
                  onChange={(e) => updateField("notifications", "smtpUser", e.target.value)}
                />
              </div>
              <div>
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={settings.notifications.smtpFrom || ""}
                  onChange={(e) => updateField("notifications", "smtpFrom", e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="whatsappEnabled"
                  checked={settings.notifications.whatsappEnabled || false}
                  onChange={(e) => updateField("notifications", "whatsappEnabled", e.target.checked)}
                />
                <Label htmlFor="whatsappEnabled">Enable WhatsApp Notifications</Label>
              </div>
              <Button onClick={() => saveSettings("notifications")} disabled={saving}>
                {saving ? "Saving..." : "Save Notification Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>TOTP Issuer</Label>
                <Input
                  value={settings.security.totpIssuer || ""}
                  onChange={(e) => updateField("security", "totpIssuer", e.target.value)}
                />
              </div>
              <div>
                <Label>Session TTL (hours)</Label>
                <Input
                  type="number"
                  value={settings.security.sessionTtlHours || 24}
                  onChange={(e) => updateField("security", "sessionTtlHours", Number(e.target.value))}
                />
              </div>
              <Button onClick={() => saveSettings("security")} disabled={saving}>
                {saving ? "Saving..." : "Save Security Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={settings.branding.primaryColor || "#2563eb"}
                  onChange={(e) => updateField("branding", "primaryColor", e.target.value)}
                />
              </div>
              <div>
                <Label>Accent Color</Label>
                <Input
                  type="color"
                  value={settings.branding.accentColor || "#10b981"}
                  onChange={(e) => updateField("branding", "accentColor", e.target.value)}
                />
              </div>
              <div>
                <Label>Favicon URL</Label>
                <Input
                  value={settings.branding.favicon || ""}
                  onChange={(e) => updateField("branding", "favicon", e.target.value)}
                />
              </div>
              <div>
                <Label>Login Tagline</Label>
                <Input
                  value={settings.branding.loginTagline || ""}
                  onChange={(e) => updateField("branding", "loginTagline", e.target.value)}
                />
              </div>
              <Button onClick={() => saveSettings("branding")} disabled={saving}>
                {saving ? "Saving..." : "Save Branding"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
