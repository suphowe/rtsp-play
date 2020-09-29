#!/bin/bash


#src_addr='rtsp://admin:abcd1234@192.168.200.218:554/Stream/Live/101?traportmode=unicast&profile=ONFProfileToken_101'
#dst_addr='http://127.0.0.1:8081/supersecret/live1'

#video_w=800
#video_h=600

#./forward_stream.sh --src_addr='rtsp://admin:abcd1234@192.168.200.218:554/Stream/Live/101?traportmode=unicast&profile=ONFProfileToken_101' --dst_addr='http://127.0.0.1:8081/supersecret/live1' --video_w=1280 --video_h=720

cd `dirname $0`


src_addr=
dst_addr=
video_w=
video_h=

_stop=false

usage()
{
	echo -e "usage: $0 --src_addr='your rtsp addr' --dst_addr='your push dst addr' --video_w='video push width' --video_h='video push height'"
}

stop_forward()
{
	_stop=true
}

start_forward()
{
	# will not exit
	echo "start forwarding \"$src_addr\" -------->  \"$dst_addr\""
	
	#try tcp connect first
	local extra_param="-rtsp_transport tcp"
	local try_opt=tcp

	while ! $_stop; do
		echo "start ffmpeg, try_opt=$try_opt, extra_param=$extra_param"
		ffmpeg $extra_param -stimeout 3000000 -i "$src_addr" -tune zerolatency -q 0 -f mpegts -codec:v mpeg1video -an -bf 0 -b:v 500k -maxrate 2500k -s ${video_w}x${video_h} $dst_addr #&>/dev/null
		echo "ffmpeg exit, code $?"

		# try other options
		case $try_opt in
			default)
				try_opt=try_tcp
				extra_param="-rtsp_transport tcp"
				;;
			*)
				try_opt=default
				extra_param=
				;;
		esac
	done
}

# parse cmd
for ((x=1; x<=$#; x++)); do
	p=$(eval echo \$$x)
	case "$p" in
	--src_addr=*)
		src_addr=${p#--src_addr=}
		;;
	--dst_addr=*)
		dst_addr=${p#--dst_addr=}
		;;
	--video_w=*)
		video_w=${p#--video_w=}
		;;
	--video_h=*)
		video_h=${p#--video_h=}
		;;
	*)
		echo -e "unknown param $p"
		exit -1
		;;
	esac
done

[[ -z "$src_addr" || -z "$dst_addr" || -z "$video_w" || -z "$video_h" ]] && usage && exit 0


trap 'echo "sig get";stop_forward;' INT QUIT TERM HUP

start_forward

# clear child process
childs=$(pgrep -P $$)
[ -n "$childs" ] && kill $childs