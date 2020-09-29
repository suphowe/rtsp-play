#!/bin/bash

# 1. list all pushing streams or a specific dst pattern
# --list [--dst_pattern='']
#
# return json is like:
#	{"ret": 0, "streams": [
#	"http://127.0.0.1:8081/supersecret/live1"
#	], "msg": "success"}




# 2. stop all streams or a specific pattern
# --stop [--dst_pattern='']
#
# return json is like: 
#	{"ret":0, "msg":"stop pids: 4428 4441"}



# 3. start new forward with params
# --start_new [--src_addr='your rtsp addr' --dst_addr='your push dst addr' --video_w='video push width' --video_h='video push height']
#
#	return json is like:
# {"ret":0, "msg":"start new: http://127.0.0.1:8081/supersecret/live1"}


cd `dirname $0`

ret_common()
{
	local ret=$1
	local msg=$2
	
	echo {\"ret\":$ret, \"msg\":\"$msg\"}
}

list_forward()
{
	local dst_pattern=
	
	local x=
	for ((x=1; x<=$#; x++)); do
		p=$(eval echo \$$x)
		case "$p" in
		--dst_pattern=*)
			dst_pattern=${p#--dst_pattern=}
			;;
		*)
			ret_common -1 "unknown param $p, usage $0 --list [--dst_pattern=xxx]"
			return
			;;
		esac
	done
	
	local list=
	if [ -n "$dst_pattern" ]; then
		list=$(ps -A x | grep forward_stream.sh | grep -v grep | grep -o "\-\-dst_addr=.*" | grep "$dst_pattern" | awk '{print $1}' | sed 's/--dst_addr=//')
	else
		list=$(ps -A x | grep forward_stream.sh | grep -v grep | grep -o "\-\-dst_addr=.*" | awk '{print $1}' | sed 's/--dst_addr=//')
	fi
	

	
	# generate json ret msg
	local list_a=($list)
	echo {\"ret\": 0, \"streams\": [
	for ((x=0; x<${#list_a[*]}; x++)); do
		if (( $x > 0 )); then echo ,; fi
			
		echo \"${list_a[$x]}\"
	done
	echo ], \"msg\": \"success\"}
}


stop_forward()
{
	local dst_pattern=
	
	local x=
	for ((x=1; x<=$#; x++)); do
		p=$(eval echo \$$x)
		case "$p" in
		--dst_pattern=*)
			dst_pattern=${p#--dst_pattern=}
			;;
		*)
			ret_common -1 "unknown param $p, usage $0 --list [--dst_pattern=xxx]"
			return
			;;
		esac
	done
	
	local stop_pids=
	if [ -n "$dst_pattern" ]; then
		#stop specific
		stop_pids=$(ps -A x | grep forward_stream.sh | grep -v grep | grep "\-\-dst_addr=.*${dst_pattern}.*" | awk '{print $1}')
	else
		# stop all
		stop_pids=$(ps -A x | grep forward_stream.sh | grep -v grep | awk '{print $1}')
	fi
	
	local child=
	for x in $stop_pids; do
		child=$(pgrep -P $x)
		kill $x $child &>/dev/null
	done
	
	ret_common 0 "stop pids: $stop_pids"
}



start_new()
{
	local src_addr=
	local dst_addr=
	local video_w=
	local video_h=
	
	
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
			ret_common -1 "unknown param $p"
			return
			;;
		esac
	done
	
	bash ./forward_stream.sh --src_addr="$src_addr" --video_w=$video_w --video_h=$video_h --dst_addr="$dst_addr" &>/dev/null &
	
	ret_common 0 "start new: $dst_addr"
}


# parse cmd
ret=-1
if (( $# > 0 )); then

	case "$1" in
	--list)
		shift
		list_forward $@
		;;
	--stop)
		shift
		stop_forward $@
		;;
	--start_new)
		shift
		start_new $@
		;;
	*)
		ret_common -1 "unknown param $1"
		;;
	esac

else
	ret_common -2 "need more param"
fi

