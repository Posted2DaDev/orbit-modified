import axios from "axios";
import React, { useState, useEffect } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import Input from "@/components/input";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent';
import { IconBellExclamation } from "@tabler/icons-react";

type props = {
	triggerToast: typeof toast;
}

const InactivitySettings: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace] = useRecoilState(workspacestate);
	const [webhookEnabled, setWebhookEnabled] = useState(false);
	const [webhookUrl, setWebhookUrl] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const res = await axios.get(`/api/workspace/${workspace.groupId}/settings/general/inactivity`);
				if (res.data.success) {
					setWebhookEnabled(res.data.value?.webhookEnabled || false);
					setWebhookUrl(res.data.value?.webhookUrl || "");
				}
			} catch (error) {
				console.error("Failed to fetch inactivity settings:", error);
			}
		};
		if (workspace.groupId) fetchSettings();
	}, [workspace.groupId]);

	const updateSettings = async () => {
		setLoading(true);
		try {
			const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/inactivity`, {
				webhookEnabled,
				webhookUrl
			});
			if (res.status === 200) {
				triggerToast.success("Updated inactivity notice settings!");
			} else {
				triggerToast.error("Failed to update settings.");
			}
		} catch (error) {
			triggerToast.error("Failed to update settings.");
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<IconBellExclamation size={20} className="text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-zinc-900 dark:text-white">Discord Webhook</p>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">Send inactivity requests to Discord</p>
					</div>
				</div>
				<SwitchComponenet 
					checked={webhookEnabled} 
					onChange={(value) => setWebhookEnabled(value)} 
					label="" 
					classoverride="mt-0"
				/>
			</div>

			{webhookEnabled && (
				<div className="space-y-3">
					<Input
						label="Webhook URL"
						placeholder="https://discord.com/api/webhooks/..."
						value={webhookUrl}
						onChange={(e) => setWebhookUrl(e.target.value)}
					/>
					<button
						onClick={updateSettings}
						disabled={loading}
						className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
					>
						{loading ? "Saving..." : "Save Settings"}
					</button>
				</div>
			)}
		</div>
	);
};

InactivitySettings.title = "Inactivity Notices";

export default InactivitySettings;
