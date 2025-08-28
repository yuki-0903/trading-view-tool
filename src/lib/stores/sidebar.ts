import { writable } from 'svelte/store';

// サイドバーの開閉状態を管理
export const sidebarOpen = writable(true);

// サイドバーを開く
export function openSidebar() {
	sidebarOpen.set(true);
}

// サイドバーを閉じる
export function closeSidebar() {
	sidebarOpen.set(false);
}

// サイドバーの開閉を切り替え
export function toggleSidebar() {
	sidebarOpen.update(open => !open);
}